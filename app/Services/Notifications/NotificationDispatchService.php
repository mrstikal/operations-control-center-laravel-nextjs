<?php

namespace App\Services\Notifications;

use App\Events\NotificationSent;
use App\Models\Notification;
use App\Models\NotificationSchedule;
use Illuminate\Support\Facades\Log;

/**
 * Responsible for creating notifications and dispatching them to the
 * broadcast layer. Also orchestrates schedule-based bulk dispatch.
 */
class NotificationDispatchService
{
    public function __construct(
        private readonly NotificationScheduleEvaluator $evaluator,
    ) {}

    /**
     * Create a single notification for a user and broadcast it.
     * Supports optional idempotency via a dedupe key + TTL window.
     *
     * @param  string|null  $dedupeKey  Unique key to prevent duplicate notifications
     * @param  int  $dedupeTtl  Minutes within which duplicates are suppressed (default: 30)
     */
    public function createForUser(
        int $userId,
        int $tenantId,
        string $type,
        string $title,
        string $message,
        string $priority = 'medium',
        ?string $notifiableType = null,
        ?int $notifiableId = null,
        ?string $actionUrl = null,
        ?array $data = null,
        ?string $dedupeKey = null,
        int $dedupeTtl = 30,
    ): ?Notification {
        // Idempotency check
        if ($dedupeKey !== null && $this->isDuplicate($userId, $tenantId, $dedupeKey, $dedupeTtl)) {
            Log::debug('NotificationDispatchService: duplicate suppressed', [
                'user_id' => $userId,
                'dedupe_key' => $dedupeKey,
                'ttl_minutes' => $dedupeTtl,
            ]);

            return null;
        }

        $payload = $data ?? [];
        if ($dedupeKey !== null) {
            $payload['_dedupe_key'] = $dedupeKey;
        }

        $notification = Notification::create([
            'user_id' => $userId,
            'tenant_id' => $tenantId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'priority' => $priority,
            'notifiable_type' => $notifiableType,
            'notifiable_id' => $notifiableId,
            'action_url' => $actionUrl,
            'data' => $payload ?: null,
            'read' => false,
        ]);

        $this->broadcast($notification);

        return $notification;
    }

    /**
     * Evaluate all active schedules for a given trigger and context,
     * then create and broadcast notifications for resolved recipients.
     *
     * @param  array<string, mixed>  $context  Runtime values for condition evaluation
     */
    public function dispatchForTrigger(
        string $trigger,
        int $tenantId,
        array $context,
        string $title,
        string $message,
        string $priority = 'medium',
        ?string $notifiableType = null,
        ?int $notifiableId = null,
        ?string $actionUrl = null,
        ?array $data = null,
    ): int {
        $schedules = NotificationSchedule::active()
            ->byTrigger($trigger)
            ->where('tenant_id', $tenantId)
            ->get();

        $dispatched = 0;

        foreach ($schedules as $schedule) {
            if (! $this->evaluator->matches($schedule, $context)) {
                continue;
            }

            $recipientIds = $this->evaluator->resolveRecipientIds($schedule);

            // Read dedupe config from recipients block
            $dedupeStrategy = $schedule->recipients['dedupe']['strategy'] ?? 'per_user_per_trigger';
            $dedupeTtl = (int) ($schedule->recipients['dedupe']['ttl_minutes'] ?? 30);

            foreach ($recipientIds as $userId) {
                try {
                    $dedupeKey = $this->buildDedupeKey(
                        $dedupeStrategy,
                        $trigger,
                        $userId,
                        $notifiableType,
                        $notifiableId,
                    );

                    $notification = $this->createForUser(
                        userId: $userId,
                        tenantId: $tenantId,
                        type: $schedule->notification_type,
                        title: $title,
                        message: $message,
                        priority: $priority,
                        notifiableType: $notifiableType,
                        notifiableId: $notifiableId,
                        actionUrl: $actionUrl,
                        data: $data,
                        dedupeKey: $dedupeKey,
                        dedupeTtl: $dedupeTtl,
                    );

                    if ($notification !== null) {
                        $dispatched++;
                    }
                } catch (\Throwable $e) {
                    Log::error('NotificationDispatchService: failed to create notification', [
                        'user_id' => $userId,
                        'schedule_id' => $schedule->id,
                        'trigger' => $trigger,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        Log::info('NotificationDispatchService: dispatch complete', [
            'trigger' => $trigger,
            'tenant_id' => $tenantId,
            'schedules_evaluated' => $schedules->count(),
            'notifications_dispatched' => $dispatched,
        ]);

        return $dispatched;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function broadcast(Notification $notification): void
    {
        try {
            event(new NotificationSent($notification));
        } catch (\Throwable $e) {
            // Broadcasting failure must not break the happy path
            Log::warning('NotificationDispatchService: broadcast failed', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Build a dedupe key based on chosen strategy.
     */
    private function buildDedupeKey(
        string $strategy,
        string $trigger,
        int $userId,
        ?string $notifiableType,
        ?int $notifiableId,
    ): string {
        $entity = $notifiableType && $notifiableId
            ? "{$notifiableType}:{$notifiableId}"
            : 'global';

        return match ($strategy) {
            'global_per_trigger' => "notif:{$trigger}:{$entity}",
            default => "notif:{$trigger}:{$entity}:u{$userId}",  // per_user_per_trigger
        };
    }

    /**
     * Check whether a notification with this dedupe key already exists
     * within the given TTL window.
     */
    private function isDuplicate(int $userId, int $tenantId, string $dedupeKey, int $ttlMinutes): bool
    {
        return Notification::where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('created_at', '>=', now()->subMinutes($ttlMinutes))
            ->whereJsonContains('data->_dedupe_key', $dedupeKey)
            ->exists();
    }
}
