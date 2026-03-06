<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\NotificationSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Periodic job that scans the database for time-based trigger conditions
 * (maintenance_due, sla_breach) and dispatches DispatchTriggerNotificationsJob
 * for each matching entity per tenant.
 *
 * Scheduled every 5 minutes via routes/console.php.
 * Only processes tenants that have at least one active schedule for the
 * relevant trigger, to avoid unnecessary DB queries.
 */
class EvaluateScheduledTriggersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    /** Days ahead to look for upcoming maintenance. */
    private const MAINTENANCE_LOOKAHEAD_DAYS = 7;

    public function __construct()
    {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $this->evaluateMaintenanceDue();
        $this->evaluateSlaBreaches();
    }

    // -------------------------------------------------------------------------
    // Trigger: maintenance_due
    // -------------------------------------------------------------------------

    private function evaluateMaintenanceDue(): void
    {
        $tenantIds = NotificationSchedule::active()
            ->byTrigger('maintenance_due')
            ->pluck('tenant_id')
            ->unique()
            ->values();

        if ($tenantIds->isEmpty()) {
            return;
        }

        $lookahead = now()->addDays(self::MAINTENANCE_LOOKAHEAD_DAYS);

        $assets = Asset::whereIn('tenant_id', $tenantIds)
            ->whereNotNull('next_maintenance')
            ->where('next_maintenance', '<=', $lookahead)
            ->where('status', '!=', 'retired')
            ->where('status', '!=', 'disposed')
            ->get(['id', 'tenant_id', 'name', 'asset_tag', 'next_maintenance', 'status']);

        foreach ($assets as $asset) {
            $daysUntilDue = (int) now()->diffInDays($asset->next_maintenance, false);

            DispatchTriggerNotificationsJob::dispatch(
                trigger: 'maintenance_due',
                tenantId: (int) $asset->tenant_id,
                context: [
                    'days_until_due' => $daysUntilDue,
                    'asset_status' => $asset->status,
                    'asset_id' => $asset->id,
                ],
                title: 'Maintenance due soon',
                message: "Asset '{$asset->name}' ({$asset->asset_tag}) has scheduled maintenance in {$daysUntilDue} days.",
                priority: $daysUntilDue <= 0 ? 'critical' : ($daysUntilDue <= 2 ? 'high' : 'medium'),
                notifiableType: Asset::class,
                notifiableId: (int) $asset->id,
                actionUrl: "/assets/{$asset->id}",
            );

            Log::debug('EvaluateScheduledTriggersJob: maintenance_due dispatched', [
                'asset_id' => $asset->id,
                'days_until_due' => $daysUntilDue,
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Trigger: sla_breach
    // -------------------------------------------------------------------------

    private function evaluateSlaBreaches(): void
    {
        $tenantIds = NotificationSchedule::active()
            ->byTrigger('sla_breach')
            ->pluck('tenant_id')
            ->unique()
            ->values();

        if ($tenantIds->isEmpty()) {
            return;
        }

        $this->evaluateContractSlaBreaches($tenantIds->all());
        $this->evaluateIncidentSlaBreaches($tenantIds->all());
    }

    private function evaluateContractSlaBreaches(array $tenantIds): void
    {
        $contracts = Contract::whereIn('tenant_id', $tenantIds)
            ->where('sla_status', 'breached')
            ->whereNotIn('status', ['done', 'draft'])
            ->get(['id', 'tenant_id', 'title', 'contract_number', 'priority', 'sla_status']);

        foreach ($contracts as $contract) {
            DispatchTriggerNotificationsJob::dispatch(
                trigger: 'sla_breach',
                tenantId: (int) $contract->tenant_id,
                context: [
                    'sla_breached' => true,
                    'severity' => $contract->priority,
                    'source' => 'contract',
                    'contract_id' => $contract->id,
                ],
                title: 'Contract SLA breached',
                message: "Contract '{$contract->title}' ({$contract->contract_number}) has breached the defined SLA.",
                priority: 'critical',
                notifiableType: Contract::class,
                notifiableId: (int) $contract->id,
                actionUrl: "/contracts/{$contract->id}",
            );
        }
    }

    private function evaluateIncidentSlaBreaches(array $tenantIds): void
    {
        $incidents = Incident::whereIn('tenant_id', $tenantIds)
            ->where('sla_breached', true)
            ->whereNotIn('status', ['resolved', 'closed'])
            ->get(['id', 'tenant_id', 'title', 'incident_number', 'severity']);

        foreach ($incidents as $incident) {
            DispatchTriggerNotificationsJob::dispatch(
                trigger: 'sla_breach',
                tenantId: (int) $incident->tenant_id,
                context: [
                    'sla_breached' => true,
                    'severity' => $incident->severity,
                    'source' => 'incident',
                    'incident_id' => $incident->id,
                ],
                title: 'Incident SLA breached',
                message: "Incident '{$incident->title}' ({$incident->incident_number}) has breached the defined SLA.",
                priority: in_array($incident->severity, ['critical', 'high']) ? 'critical' : 'high',
                notifiableType: Incident::class,
                notifiableId: (int) $incident->id,
                actionUrl: "/incidents/{$incident->id}",
            );
        }
    }
}
