<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Models\NotificationSchedule;
use App\Models\User;
use App\Services\Maintenance\MaintenanceScheduleService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Periodic maintenance schedule evaluator (Phase B).
 *
 * Responsibilities:
 *  1. Sync assets.next_maintenance from active maintenance_schedules.
 *  2. Evaluate due_state transitions (ok -> due_soon -> overdue).
 *  3. Dispatch DispatchTriggerNotificationsJob for actionable transitions,
 *     only when tenant has an active notification schedule for the trigger.
 *  4. De-duplicate: update last_notified_at so repeat runs don't spam.
 */
class EvaluateMaintenanceSchedulesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $maxExceptions = 2;

    public function __construct()
    {
        $this->onQueue('default');
    }

    /**
     * Exponential backoff: 60s, 300s, 600s
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [60, 300, 600];
    }

    public function handle(MaintenanceScheduleService $scheduleService): void
    {
        $synced = 0;
        $notified = 0;

        // Tenants that have active notification schedules for maintenance triggers.
        $notifyTenants = $this->tenantsWithMaintenanceTriggers();

        Asset::query()
            ->whereHas('maintenanceSchedules', fn (Builder $q) => $q->where('is_active', true))
            ->with('maintenanceSchedules')
            ->select(['id', 'tenant_id', 'name', 'asset_tag', 'next_maintenance'])
            ->chunkById(100, function ($assets) use (
                $scheduleService,
                $notifyTenants,
                &$synced,
                &$notified
            ): void {
                foreach ($assets as $asset) {
                    // 1. Sync next_maintenance
                    $before = $asset->next_maintenance?->toDateTimeString();
                    $scheduleService->syncAssetNextMaintenance($asset);
                    $asset->refresh();
                    if ($before !== $asset->next_maintenance?->toDateTimeString()) {
                        $synced++;
                    }

                    // 2. Evaluate state transitions and notify per schedule
                    foreach ($asset->maintenanceSchedules as $schedule) {
                        if (! $schedule->is_active) {
                            continue;
                        }

                        $transition = $scheduleService->evaluateStateTransition($schedule);

                        if ($transition === null) {
                            continue;
                        }

                        $newState = $transition['new'];
                        $oldState = $transition['old'];

                        if ($oldState !== $newState) {
                            $this->recordDueStateAudit($asset, $schedule, $oldState, $newState);
                        }

                        if ($newState === MaintenanceSchedule::DUE_STATE_OK) {
                            continue; // No notification for returning to OK
                        }

                        $tenantId = (int) $asset->tenant_id;

                        if (! $notifyTenants->contains($tenantId)) {
                            continue; // No active notification schedule for this tenant
                        }

                        $this->dispatchMaintenanceNotification(
                            $asset,
                            $schedule,
                            $newState,
                            $oldState
                        );
                        $notified++;
                    }
                }
            });

        Log::info('EvaluateMaintenanceSchedulesJob: done', [
            'synced_assets' => $synced,
            'notifications_dispatched' => $notified,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('EvaluateMaintenanceSchedulesJob: failed permanently', [
            'error' => $exception->getMessage(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function tenantsWithMaintenanceTriggers(): \Illuminate\Support\Collection
    {
        return NotificationSchedule::active()
            ->whereIn('trigger', ['maintenance_due', 'maintenance_schedule_due', 'maintenance_schedule_overdue'])
            ->pluck('tenant_id')
            ->unique()
            ->values();
    }

    private function dispatchMaintenanceNotification(
        Asset $asset,
        MaintenanceSchedule $schedule,
        string $newState,
        string $oldState
    ): void {
        $tenantId = (int) $asset->tenant_id;
        $daysUntil = $schedule->daysUntilDue() ?? 0;
        $trigger = $newState === MaintenanceSchedule::DUE_STATE_OVERDUE
            ? 'maintenance_schedule_overdue'
            : 'maintenance_schedule_due';

        $isOverdue = $newState === MaintenanceSchedule::DUE_STATE_OVERDUE;
        $priority = $isOverdue ? 'critical' : ($daysUntil <= 2 ? 'high' : 'medium');

        $title = $isOverdue
            ? 'Maintenance overdue'
            : 'Maintenance due soon';

        $message = $isOverdue
            ? "Maintenance '{$schedule->description}' on asset '{$asset->name}' ({$asset->asset_tag}) is overdue."
            : "Maintenance '{$schedule->description}' on asset '{$asset->name}' ({$asset->asset_tag}) is due in {$daysUntil} day(s).";

        DispatchTriggerNotificationsJob::dispatch(
            trigger: $trigger,
            tenantId: $tenantId,
            context: [
                'due_state' => $newState,
                'previous_due_state' => $oldState,
                'days_until_due' => $daysUntil,
                'asset_id' => $asset->id,
                'asset_status' => $asset->status ?? 'operational',
                'schedule_id' => $schedule->id,
                'frequency' => $schedule->frequency,
            ],
            title: $title,
            message: $message,
            priority: $priority,
            notifiableType: Asset::class,
            notifiableId: (int) $asset->id,
            actionUrl: "/assets/{$asset->id}",
        );

        Log::debug('EvaluateMaintenanceSchedulesJob: notification dispatched', [
            'trigger' => $trigger,
            'asset_id' => $asset->id,
            'schedule_id' => $schedule->id,
            'new_state' => $newState,
        ]);
    }

    private function recordDueStateAudit(
        Asset $asset,
        MaintenanceSchedule $schedule,
        string $oldState,
        string $newState
    ): void {
        $auditUserId = $this->resolveAuditUserId((int) $asset->tenant_id);
        if ($auditUserId === null) {
            return;
        }

        $asset->recordAudit(
            'maintenance_due_state_changed',
            $auditUserId,
            [
                'schedule_id' => $schedule->id,
                'due_state' => $oldState,
            ],
            [
                'schedule_id' => $schedule->id,
                'due_state' => $newState,
            ],
            'system_job'
        );
    }

    private function resolveAuditUserId(int $tenantId): ?int
    {
        $userId = User::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('id', 'asc')
            ->value('id');

        return $userId === null ? null : (int) $userId;
    }
}
