<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Event;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('status', 'active')->get();
        if ($tenants->isEmpty()) {
            return;
        }

        $tenant = $tenants->first();

        $users = User::where('tenant_id', $tenant->id)->pluck('id')->values();
        if ($users->isEmpty()) {
            return;
        }

        // Get contracts and incidents from ALL tenants, not just first one
        $contracts = Contract::whereIn('tenant_id', $tenants->pluck('id'))->get()->values();
        $incidents = Incident::whereIn('tenant_id', $tenants->pluck('id'))->get()->values();

        if ($contracts->isEmpty() || $incidents->isEmpty()) {
            return;
        }

        $now = now();
        $events = [];

        $pickUser = fn (int $i) => $users[$i % $users->count()];
        $approvedContracts = $contracts->where('status', 'approved')->values();
        $inProgressContracts = $contracts->where('status', 'in_progress')->values();
        $resolvedIncidents = $incidents->where('status', 'resolved')->values();
        $escalatedIncidents = $incidents->where('status', 'escalated')->values();
        $inProgressIncidents = $incidents->where('status', 'in_progress')->values();
        $slaBreachedIncidents = $incidents->where('sla_breached', true)->values();

        // ContractApproved (5)
        for ($i = 0; $i < min(5, $approvedContracts->count()); $i++) {
            $contract = $approvedContracts[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractApproved',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $pickUser($i),
                'payload' => [
                    'contract_number' => $contract->contract_number,
                    'title' => $contract->title,
                    'new_status' => 'approved',
                    'message' => "Contract {$contract->contract_number} approved by management. Scheduling kickoff meeting.",
                    'severity' => 'low',
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'contract',
                ],
                'version' => 1,
                'occurred_at' => $now->copy()->subDays(12)->addHours($i * 3),
            ];
        }

        // ContractStatusChanged (5)
        for ($i = 0; $i < min(5, $inProgressContracts->count()); $i++) {
            $contract = $inProgressContracts[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractStatusChanged',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $pickUser($i + 1),
                'payload' => [
                    'contract_number' => $contract->contract_number,
                    'title' => $contract->title,
                    'new_status' => 'in_progress',
                    'message' => "Work initiated on contract {$contract->contract_number}. Field team dispatched.",
                    'severity' => 'medium',
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'contract',
                ],
                'version' => 2,
                'occurred_at' => $now->copy()->subDays(10)->addHours($i * 4),
            ];
        }

        // IncidentCreated (5)
        for ($i = 0; $i < min(5, $incidents->count()); $i++) {
            $incident = $incidents[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $pickUser($i + 2),
                'payload' => [
                    'incident_number' => $incident->incident_number,
                    'title' => $incident->title,
                    'severity' => $incident->severity,
                    'message' => "New incident {$incident->incident_number} reported: {$incident->title}",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'incident',
                ],
                'version' => 1,
                'occurred_at' => $now->copy()->subDays(9)->addHours($i * 2),
            ];
        }

        // IncidentStatusChanged (5)
        for ($i = 0; $i < min(5, $inProgressIncidents->count()); $i++) {
            $incident = $inProgressIncidents[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentStatusChanged',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $pickUser($i + 3),
                'payload' => [
                    'incident_number' => $incident->incident_number,
                    'title' => $incident->title,
                    'new_status' => 'in_progress',
                    'severity' => 'medium',
                    'message' => "Technician assigned to incident {$incident->incident_number}. Investigation underway.",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'incident',
                ],
                'version' => 2,
                'occurred_at' => $now->copy()->subDays(8)->addHours($i * 3),
            ];
        }

        // IncidentEscalated (5)
        for ($i = 0; $i < min(5, $escalatedIncidents->count()); $i++) {
            $incident = $escalatedIncidents[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentEscalated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $pickUser($i + 4),
                'payload' => [
                    'incident_number' => $incident->incident_number,
                    'title' => $incident->title,
                    'severity' => 'high',
                    'escalation_level' => 'level_2',
                    'message' => "Incident {$incident->incident_number} escalated to senior team. Enhanced response protocol activated.",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'incident',
                ],
                'version' => 3,
                'occurred_at' => $now->copy()->subDays(6)->addHours($i * 2),
            ];
        }

        // IncidentResolved (5)
        for ($i = 0; $i < min(5, $resolvedIncidents->count()); $i++) {
            $incident = $resolvedIncidents[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentResolved',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $pickUser($i + 5),
                'payload' => [
                    'incident_number' => $incident->incident_number,
                    'title' => $incident->title,
                    'new_status' => 'resolved',
                    'severity' => 'low',
                    'message' => "Incident {$incident->incident_number} resolved and verified.",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'incident',
                ],
                'version' => 4,
                'occurred_at' => $now->copy()->subDays(5)->addHours($i * 2),
            ];
        }

        // ContractBudgetWarning (5)
        for ($i = 0; $i < min(5, $inProgressContracts->count()); $i++) {
            $contract = $inProgressContracts[$i];
            $usage = $contract->budget > 0 ? round(($contract->spent / $contract->budget) * 100, 1) : 0;

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractBudgetWarning',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $pickUser($i + 6),
                'payload' => [
                    'contract_number' => $contract->contract_number,
                    'title' => $contract->title,
                    'budget_usage' => $usage,
                    'severity' => $usage >= 85 ? 'critical' : 'high',
                    'message' => "Budget watch: {$contract->contract_number} at {$usage}% spend.",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'contract',
                ],
                'version' => 5,
                'occurred_at' => $now->copy()->subDays(4)->addHours($i * 3),
            ];
        }

        // ContractSLAWarning (5)
        for ($i = 0; $i < min(5, $inProgressContracts->count()); $i++) {
            $contract = $inProgressContracts[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractSLAWarning',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $pickUser($i + 7),
                'payload' => [
                    'contract_number' => $contract->contract_number,
                    'title' => $contract->title,
                    'severity' => 'critical',
                    'message' => "SLA warning on {$contract->contract_number}: response window trending tight.",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'contract',
                ],
                'version' => 6,
                'occurred_at' => $now->copy()->subDays(3)->addHours($i * 2),
            ];
        }

        // AssetMaintenanceScheduled (5)
        for ($i = 0; $i < 5; $i++) {
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'AssetMaintenanceScheduled',
                'aggregate_type' => 'Asset',
                'aggregate_id' => $i + 1,
                'user_id' => $pickUser($i + 8),
                'payload' => [
                    'asset_reference' => 'MNT-2026-'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT),
                    'severity' => 'low',
                    'message' => 'Preventive maintenance scheduled. Work order created for field team.',
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'asset',
                ],
                'version' => 1,
                'occurred_at' => $now->copy()->subDays(2)->addHours($i * 3),
            ];
        }

        // IncidentSLABreach (5)
        for ($i = 0; $i < min(5, $slaBreachedIncidents->count()); $i++) {
            $incident = $slaBreachedIncidents[$i];

            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentSLABreach',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $pickUser($i + 9),
                'payload' => [
                    'incident_number' => $incident->incident_number,
                    'title' => $incident->title,
                    'severity' => 'critical',
                    'message' => "SLA breach recorded for {$incident->incident_number} ({$incident->title}).",
                ],
                'metadata' => [
                    'channel' => 'dashboard_feed',
                    'entity' => 'incident',
                ],
                'version' => 7,
                'occurred_at' => $now->copy()->subDays(1)->addHours($i * 2),
            ];
        }

        foreach ($events as $event) {
            Event::updateOrCreate(
                [
                    'tenant_id' => $event['tenant_id'],
                    'aggregate_type' => $event['aggregate_type'],
                    'aggregate_id' => $event['aggregate_id'],
                    'version' => $event['version'],
                ],
                $event
            );
        }
    }
}
