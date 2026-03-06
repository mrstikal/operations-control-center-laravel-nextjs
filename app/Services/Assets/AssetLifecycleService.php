<?php

namespace App\Services\Assets;

use App\Models\Asset;
use App\Models\MaintenanceLog;
use App\Models\MaintenanceSchedule;
use App\Services\Maintenance\MaintenanceScheduleService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * AssetLifecycleService – business logic for asset lifecycle and maintenance.
 *
 * Extracted from AssetController to satisfy SRP.
 */
class AssetLifecycleService
{
    public function __construct(private readonly MaintenanceScheduleService $maintenanceScheduleService) {}

    // -------------------------------------------------------------------------
    // Lifecycle transitions
    // -------------------------------------------------------------------------

    /**
     * Retire an asset (status → retired).
     *
     * @param  array{reason:string, retirement_date?:string}  $validated
     */
    public function retire(Asset $asset, array $validated, int $actorId): void
    {
        $oldStatus = $asset->status;
        $asset->update(['status' => 'retired']);

        $asset->recordAudit(
            'retired',
            $actorId,
            ['status' => $oldStatus],
            ['status' => 'retired', 'retirement_date' => $validated['retirement_date'] ?? now()->toDateString()],
            $validated['reason']
        );
    }

    /**
     * Mark an asset as disposed (status → disposed).
     *
     * @param  array{reason:string, disposal_method?:string, disposal_date?:string}  $validated
     */
    public function dispose(Asset $asset, array $validated, int $actorId): void
    {
        $oldStatus = $asset->status;
        $asset->update(['status' => 'disposed']);

        $asset->recordAudit(
            'disposed',
            $actorId,
            ['status' => $oldStatus],
            [
                'status' => 'disposed',
                'disposal_method' => $validated['disposal_method'] ?? null,
                'disposal_date' => $validated['disposal_date'] ?? now()->toDateString(),
            ],
            $validated['reason']
        );
    }

    /**
     * Transfer an asset to a new location / department.
     *
     * @param  array{location:string, department?:string, reason:string}  $validated
     */
    public function transfer(Asset $asset, array $validated, int $actorId): void
    {
        $oldValues = [
            'location' => $asset->location,
            'department' => $asset->department,
        ];

        $asset->update([
            'location' => $validated['location'],
            'department' => $validated['department'] ?? $asset->department,
        ]);

        $asset->recordAudit(
            'transferred',
            $actorId,
            $oldValues,
            [
                'location' => $validated['location'],
                'department' => $validated['department'] ?? $asset->department,
            ],
            $validated['reason']
        );
    }

    /**
     * Reassign an asset to another user.
     *
     * @param  array{assigned_to?:int|null, reason:string}  $validated
     */
    public function reassign(Asset $asset, array $validated, int $actorId): void
    {
        $oldAssignedTo = $asset->assigned_to;

        $asset->update([
            'assigned_to' => $validated['assigned_to'] ?? null,
        ]);

        $asset->recordAudit(
            'reassigned',
            $actorId,
            ['assigned_to' => $oldAssignedTo],
            ['assigned_to' => $asset->assigned_to],
            $validated['reason']
        );
    }

    // -------------------------------------------------------------------------
    // Maintenance
    // -------------------------------------------------------------------------

    /**
     * Log a maintenance event for an asset.
     *
     * Returns the created MaintenanceLog and the number of recalculated schedules.
     *
     * @param  array<string, mixed>  $validated
     * @return array{log: MaintenanceLog, recalculated_schedules: int}
     */
    public function logMaintenance(Asset $asset, array $validated, int $actorId): array
    {
        $maintenancePayload = [
            'hours_spent' => $validated['hours_spent'] ?? null,
            'cost' => $validated['cost'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'parts_replaced' => $validated['parts_replaced'] ?? null,
        ];

        if (isset($validated['performed_at'])) {
            $maintenancePayload['performed_at'] = $validated['performed_at'];
        }

        $maintenanceLog = null;
        $recalculatedSchedules = 0;

        DB::transaction(function () use ($asset, $validated, $maintenancePayload, $actorId, &$maintenanceLog, &$recalculatedSchedules): void {
            $maintenanceLog = $asset->logMaintenance(
                auth()->user(),
                $validated['type'],
                $validated['description'],
                $maintenancePayload
            );

            $performedAt = Carbon::parse((string) $maintenanceLog->performed_at);

            $recalculatedSchedules = $this->maintenanceScheduleService
                ->recalculateAfterMaintenanceLog($asset, $performedAt);

            $asset->recordAudit(
                'maintenance_logged',
                $actorId,
                null,
                [
                    'maintenance_log_id' => $maintenanceLog->id,
                    'type' => $validated['type'],
                    'description' => $validated['description'],
                    'hours_spent' => $validated['hours_spent'] ?? null,
                    'cost' => $validated['cost'] ?? null,
                    'recalculated_schedules' => $recalculatedSchedules,
                ]
            );

            if ($recalculatedSchedules > 0) {
                $asset->recordAudit(
                    'maintenance_schedule_recalculated',
                    $actorId,
                    null,
                    [
                        'maintenance_log_id' => $maintenanceLog->id,
                        'recalculated_schedules' => $recalculatedSchedules,
                    ]
                );
            }
        });

        /** @var MaintenanceLog $maintenanceLog */
        return ['log' => $maintenanceLog, 'recalculated_schedules' => $recalculatedSchedules];
    }

    /**
     * Create a maintenance schedule for an asset and sync next maintenance date.
     *
     * @param  array<string, mixed>  $validated
     */
    public function scheduleMaintenance(Asset $asset, array $validated, int $actorId): MaintenanceSchedule
    {
        /** @var MaintenanceSchedule $schedule */
        $schedule = $asset->maintenanceSchedules()->create([
            ...$validated,
            'next_due_date' => $validated['next_due_date'] ?? now()->addDays($validated['interval_days'] ?? 30),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->maintenanceScheduleService->syncAssetNextMaintenance($asset);

        $asset->recordAudit(
            'maintenance_scheduled',
            $actorId,
            null,
            [
                'schedule_id' => $schedule->id,
                'frequency' => $schedule->frequency,
                'interval_days' => $schedule->interval_days,
                'next_due_date' => $schedule->next_due_date,
            ]
        );

        return $schedule;
    }
}
