<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Event;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class DashboardEventSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();
        if (!$tenant) return;

        $users = User::where('tenant_id', $tenant->id)->limit(3)->get();
        if ($users->isEmpty()) return;

        $contracts = Contract::where('tenant_id', $tenant->id)
            ->whereIn('contract_number', ['CT-2026-001', 'CT-2026-004', 'CT-2026-008'])
            ->get()
            ->keyBy('contract_number');

        $incidents = Incident::where('tenant_id', $tenant->id)
            ->whereIn('incident_number', ['INC-2026-001', 'INC-2026-003', 'INC-2026-005'])
            ->get()
            ->keyBy('incident_number');

        $now = now();
        $events = [];

        if (isset($contracts['CT-2026-001'])) {
            $contract = $contracts['CT-2026-001'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $users[0]->id,
                'payload' => ['contract_number' => 'CT-2026-001'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(30),
            ];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractStatusChanged',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $users[1]->id,
                'payload' => ['new_status' => 'in_progress'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 2,
                'occurred_at' => $now->copy()->subHours(22),
            ];
        }

        if (isset($contracts['CT-2026-004'])) {
            $contract = $contracts['CT-2026-004'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractStatusChanged',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $users[1]->id,
                'payload' => ['new_status' => 'approved'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(16),
            ];
        }

        if (isset($contracts['CT-2026-008'])) {
            $contract = $contracts['CT-2026-008'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractStatusChanged',
                'aggregate_type' => 'Contract',
                'aggregate_id' => $contract->id,
                'user_id' => $users[2]->id,
                'payload' => ['new_status' => 'blocked'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(8),
            ];
        }

        if (isset($incidents['INC-2026-001'])) {
            $incident = $incidents['INC-2026-001'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $users[0]->id,
                'payload' => ['incident_number' => 'INC-2026-001', 'severity' => 'medium'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(12),
            ];
        }

        if (isset($incidents['INC-2026-003'])) {
            $incident = $incidents['INC-2026-003'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentEscalated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $users[2]->id,
                'payload' => ['escalation_level' => 'level_2', 'severity' => 'critical'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(6),
            ];
        }

        if (isset($incidents['INC-2026-005'])) {
            $incident = $incidents['INC-2026-005'];
            $events[] = [
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentStatusChanged',
                'aggregate_type' => 'Incident',
                'aggregate_id' => $incident->id,
                'user_id' => $users[1]->id,
                'payload' => ['new_status' => 'in_progress', 'severity' => 'critical'],
                'metadata' => ['channel' => 'dashboard_feed'],
                'version' => 1,
                'occurred_at' => $now->copy()->subHours(2),
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

