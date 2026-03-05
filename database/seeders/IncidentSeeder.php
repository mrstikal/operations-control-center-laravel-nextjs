<?php

namespace Database\Seeders;

use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();
        if (!$tenant) return;

        // Get some users to assign as reporters
        $users = User::where('tenant_id', $tenant->id)->limit(3)->get();
        if ($users->isEmpty()) return;

        $now = now();
        $incidents = [
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-001',
                'title' => 'HVAC System Temperature Fluctuation',
                'description' => 'Downtown office experiencing inconsistent temperature control in west wing. Temperature varies between 68-76F.',
                'category' => 'hvac',
                'severity' => 'medium',
                'status' => 'open',
                'priority' => 'high',
                'reported_by' => $users[0]->id,
                'reported_at' => $now->copy()->subHours(6),
                'sla_resolution_deadline' => $now->copy()->addMinutes(45),
                'sla_breached' => false,
                'created_at' => $now->copy()->subHours(6),
                'updated_at' => $now->copy()->subHours(2),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-002',
                'title' => 'Network Switch Port Malfunction',
                'description' => 'Core network switch port 24 showing packet loss and intermittent connectivity. Affecting 3 departments.',
                'category' => 'network',
                'severity' => 'critical',
                'status' => 'in_progress',
                'priority' => 'critical',
                'reported_by' => $users[1]->id,
                'assigned_to' => $users[2]->id,
                'reported_at' => $now->copy()->subHours(3),
                'acknowledged_at' => $now->copy()->subHours(2)->subMinutes(40),
                'started_at' => $now->copy()->subHours(2),
                'sla_resolution_deadline' => $now->copy()->addHours(5),
                'sla_breached' => false,
                'created_at' => $now->copy()->subHours(3),
                'updated_at' => $now->copy()->subHour(),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-003',
                'title' => 'Emergency Backup Generator Test Failure',
                'description' => 'Hospital backup generator failed to start during routine testing. Maintenance team notified.',
                'category' => 'power',
                'severity' => 'critical',
                'status' => 'escalated',
                'priority' => 'critical',
                'reported_by' => $users[2]->id,
                'assigned_to' => $users[0]->id,
                'reported_at' => $now->copy()->subHours(2),
                'acknowledged_at' => $now->copy()->subHours(1)->subMinutes(40),
                'started_at' => $now->copy()->subHours(1)->subMinutes(20),
                'sla_resolution_deadline' => $now->copy()->addHours(1),
                'sla_breached' => false,
                'created_at' => $now->copy()->subHours(2),
                'updated_at' => $now->copy()->subMinutes(30),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-004',
                'title' => 'HVAC Filter Replacement Overdue',
                'description' => 'Retail chain store #7 HVAC filters exceeded maintenance interval. Scheduled for replacement.',
                'category' => 'hvac',
                'severity' => 'low',
                'status' => 'resolved',
                'priority' => 'low',
                'reported_by' => $users[0]->id,
                'reported_at' => $now->copy()->subDays(2),
                'acknowledged_at' => $now->copy()->subDays(2)->addMinutes(30),
                'started_at' => $now->copy()->subDays(2)->addHours(2),
                'resolved_at' => $now->copy()->subHours(4),
                'sla_breached' => false,
                'created_at' => $now->copy()->subDays(2),
                'updated_at' => $now->copy()->subHours(4),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-005',
                'title' => 'Water Leak Detected in Server Room',
                'description' => 'Minor water leak detected above data center cooling system. Immediate investigation required.',
                'category' => 'infrastructure',
                'severity' => 'critical',
                'status' => 'open',
                'priority' => 'critical',
                'reported_by' => $users[1]->id,
                'reported_at' => $now->copy()->subHours(10),
                'sla_resolution_deadline' => $now->copy()->subHour(),
                'sla_breached' => true,
                'created_at' => $now->copy()->subHours(10),
                'updated_at' => $now->copy()->subMinutes(15),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-006',
                'title' => 'Preventive Maintenance Completed',
                'description' => 'Quarterly preventive maintenance performed on all HVAC units in manufacturing facility.',
                'category' => 'maintenance',
                'severity' => 'low',
                'status' => 'closed',
                'priority' => 'low',
                'reported_by' => $users[2]->id,
                'assigned_to' => $users[2]->id,
                'reported_at' => $now->copy()->subDays(7),
                'acknowledged_at' => $now->copy()->subDays(7)->addHour(),
                'started_at' => $now->copy()->subDays(6),
                'resolved_at' => $now->copy()->subDays(5),
                'closed_at' => $now->copy()->subDays(4),
                'sla_breached' => false,
                'created_at' => $now->copy()->subDays(7),
                'updated_at' => $now->copy()->subDays(4),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-007',
                'title' => 'Door Access Controller Offline',
                'description' => 'Access controller in east lobby is intermittently unreachable from central panel.',
                'category' => 'security',
                'severity' => 'high',
                'status' => 'in_progress',
                'priority' => 'high',
                'reported_by' => $users[0]->id,
                'assigned_to' => $users[1]->id,
                'reported_at' => $now->copy()->subHours(18),
                'acknowledged_at' => $now->copy()->subHours(17)->subMinutes(35),
                'started_at' => $now->copy()->subHours(17),
                'sla_resolution_deadline' => $now->copy()->addHours(6),
                'sla_breached' => false,
                'created_at' => $now->copy()->subHours(18),
                'updated_at' => $now->copy()->subHours(2),
            ],
            [
                'tenant_id' => $tenant->id,
                'incident_number' => 'INC-2026-008',
                'title' => 'Building B Chiller Restart',
                'description' => 'Unexpected chiller restart caused temporary loss of cooling in level 2 offices.',
                'category' => 'hvac',
                'severity' => 'medium',
                'status' => 'resolved',
                'priority' => 'medium',
                'reported_by' => $users[2]->id,
                'assigned_to' => $users[0]->id,
                'reported_at' => $now->copy()->subDays(1),
                'acknowledged_at' => $now->copy()->subDays(1)->addMinutes(25),
                'started_at' => $now->copy()->subDays(1)->addHour(),
                'resolved_at' => $now->copy()->subHours(1),
                'sla_breached' => false,
                'created_at' => $now->copy()->subDays(1),
                'updated_at' => $now->copy()->subHour(),
            ],
        ];

        foreach ($incidents as $incident) {
            Incident::updateOrCreate(
                [
                    'tenant_id' => $incident['tenant_id'],
                    'incident_number' => $incident['incident_number'],
                ],
                $incident
            );
        }
    }
}

