<?php

namespace App\Services\Maintenance;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use Illuminate\Support\Carbon;

class MaintenanceScheduleService
{
    /**
     * Recalculate all active schedules for an asset after maintenance execution.
     *
     * @return int Number of schedules that were updated.
     */
    public function recalculateAfterMaintenanceLog(Asset $asset, Carbon $performedAt): int
    {
        $updated = 0;

        $asset->maintenanceSchedules()
            ->active()
            ->get()
            ->each(function (MaintenanceSchedule $schedule) use ($performedAt, &$updated): void {
                $nextDueDate = $this->calculateNextDueDate($schedule, $performedAt);

                if (! $schedule->next_due_date->equalTo($nextDueDate)) {
                    $schedule->update([
                        'next_due_date' => $nextDueDate,
                        'due_state' => MaintenanceSchedule::DUE_STATE_OK,
                    ]);
                    $updated++;
                }
            });

        $this->syncAssetNextMaintenance($asset);

        return $updated;
    }

    /**
     * Sync asset.next_maintenance to the nearest active schedule due date.
     */
    public function syncAssetNextMaintenance(Asset $asset): void
    {
        $nextDueDate = $asset->maintenanceSchedules()
            ->active()
            ->orderBy('next_due_date', 'asc')
            ->value('next_due_date');

        $current = $asset->next_maintenance?->toDateTimeString();
        $next = $nextDueDate ? Carbon::parse($nextDueDate)->toDateTimeString() : null;

        if ($current !== $next) {
            $asset->update(['next_maintenance' => $nextDueDate]);
        }
    }

    public function calculateNextDueDate(MaintenanceSchedule $schedule, Carbon $performedAt): Carbon
    {
        $intervalDays = $this->resolveIntervalDays($schedule);

        return $performedAt->copy()->addDays($intervalDays);
    }

    public function resolveIntervalDays(MaintenanceSchedule $schedule): int
    {
        if ($schedule->interval_days && $schedule->interval_days > 0) {
            return (int) $schedule->interval_days;
        }

        return match ($schedule->frequency) {
            'daily' => 1,
            'weekly' => 7,
            'monthly' => 30,
            'quarterly' => 90,
            'yearly' => 365,
            default => 30,
        };
    }

    // -------------------------------------------------------------------------
    // Due-state evaluation (Phase B part 2)
    // -------------------------------------------------------------------------

    /**
     * Compute the due_state for a schedule based on next_due_date.
     *
     * @return string 'ok' | 'due_soon' | 'overdue'
     */
    public function computeDueState(MaintenanceSchedule $schedule): string
    {
        if (! $schedule->is_active) {
            return MaintenanceSchedule::DUE_STATE_OK;
        }

        $nextDueDate = $schedule->next_due_date;
        if (! $nextDueDate instanceof Carbon) {
            return MaintenanceSchedule::DUE_STATE_OK;
        }

        if ($nextDueDate->isPast()) {
            return MaintenanceSchedule::DUE_STATE_OVERDUE;
        }

        $daysBefore = $schedule->notifyDaysBefore();
        if ($nextDueDate->lte(now()->addDays($daysBefore))) {
            return MaintenanceSchedule::DUE_STATE_DUE_SOON;
        }

        return MaintenanceSchedule::DUE_STATE_OK;
    }

    /**
     * Evaluate the state transition for a single schedule.
     * Updates due_state + last_notified_at if changed.
     * Returns transition info or null if no actionable transition.
     *
     * @return array{old: string, new: string, schedule: MaintenanceSchedule}|null
     */
    public function evaluateStateTransition(MaintenanceSchedule $schedule): ?array
    {
        $newState = $this->computeDueState($schedule);
        $oldState = $schedule->due_state ?? MaintenanceSchedule::DUE_STATE_OK;

        // State changed OR still due_soon/overdue but not yet notified in current cycle
        $stateChanged = $oldState !== $newState;
        $needsNotify = $stateChanged || (
            $newState !== MaintenanceSchedule::DUE_STATE_OK
            && ! $schedule->wasRecentlyNotified()
        );

        if (! $needsNotify) {

            return null;
        }

        $schedule->update([
            'due_state' => $newState,
            'last_notified_at' => now(),
        ]);

        return [
            'old' => $oldState,
            'new' => $newState,
            'schedule' => $schedule->fresh(),
        ];
    }
}
