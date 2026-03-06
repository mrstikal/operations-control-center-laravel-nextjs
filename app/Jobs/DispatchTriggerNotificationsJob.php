<?php

namespace App\Jobs;

use App\Services\Notifications\NotificationDispatchService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Async job that calls NotificationDispatchService::dispatchForTrigger().
 *
 * Dispatch this job from event listeners when a business event occurs
 * (e.g. incident assigned, contract status changed). The job evaluates
 * all matching notification schedules and creates notifications for
 * resolved recipients.
 *
 * Usage:
 *   DispatchTriggerNotificationsJob::dispatch(
 *       trigger: 'incident_assigned',
 *       tenantId: $incident->tenant_id,
 *       context: ['severity' => $incident->severity],
 *       title: 'Incident assigned',
 *       message: "Incident #{$incident->incident_number} was assigned.",
 *       priority: $incident->severity === 'critical' ? 'critical' : 'high',
 *       notifiableType: Incident::class,
 *       notifiableId: $incident->id,
 *       actionUrl: "/incidents/{$incident->id}",
 *   );
 */
class DispatchTriggerNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Maximum number of attempts before the job is failed. */
    public int $tries = 3;

    /** Seconds to wait between attempts (exponential via backoff()). */
    public int $maxExceptions = 3;

    public function __construct(
        public readonly string $trigger,
        public readonly int $tenantId,
        public readonly array $context,
        public readonly string $title,
        public readonly string $message,
        public readonly string $priority = 'medium',
        public readonly ?string $notifiableType = null,
        public readonly ?int $notifiableId = null,
        public readonly ?string $actionUrl = null,
        public readonly ?array $data = null,
    ) {
        $this->onQueue('notifications');
    }

    /**
     * Exponential backoff: 30s, 120s, 300s
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 120, 300];
    }

    public function handle(NotificationDispatchService $service): void
    {
        $dispatched = $service->dispatchForTrigger(
            trigger: $this->trigger,
            tenantId: $this->tenantId,
            context: $this->context,
            title: $this->title,
            message: $this->message,
            priority: $this->priority,
            notifiableType: $this->notifiableType,
            notifiableId: $this->notifiableId,
            actionUrl: $this->actionUrl,
            data: $this->data,
        );

        Log::info('DispatchTriggerNotificationsJob: done', [
            'trigger' => $this->trigger,
            'tenant_id' => $this->tenantId,
            'dispatched' => $dispatched,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('DispatchTriggerNotificationsJob: failed permanently', [
            'trigger' => $this->trigger,
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
