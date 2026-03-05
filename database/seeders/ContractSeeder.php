<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContractSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();
        if (!$tenant) return;

        // Get some users to assign to contracts
        $users = User::where('tenant_id', $tenant->id)->limit(3)->get();
        if ($users->isEmpty()) return;

        $now = now();
        $contracts = [
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-001',
                'title' => 'Downtown Office HVAC Maintenance',
                'description' => 'Quarterly HVAC system maintenance and inspection for downtown office building. Includes preventive maintenance, emergency repairs, and performance monitoring.',
                'client_id' => $users[0]->id,
                'assigned_to' => $users[1]->id,
                'status' => 'in_progress',
                'priority' => 'high',
                'start_date' => now()->subMonths(2),
                'due_date' => now()->addMonths(10),
                'budget' => 45000.00,
                'spent' => 12500.00,
                'sla_hours' => 96,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-002',
                'title' => 'Industrial Plant Network Upgrade',
                'description' => 'Complete network infrastructure upgrade and monitoring system installation. Includes cabling, switch upgrades, and 24/7 monitoring.',
                'client_id' => $users[0]->id,
                'assigned_to' => $users[2]->id,
                'status' => 'in_progress',
                'priority' => 'high',
                'start_date' => now()->subMonths(1),
                'due_date' => now()->addMonths(5),
                'budget' => 125000.00,
                'spent' => 55000.00,
                'sla_hours' => 48,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-003',
                'title' => 'Hospital Facility Management',
                'description' => 'Comprehensive facility management including preventive maintenance and emergency response. Critical systems monitoring with 1-hour SLA.',
                'client_id' => $users[1]->id,
                'assigned_to' => $users[2]->id,
                'status' => 'in_progress',
                'priority' => 'critical',
                'start_date' => now()->subMonths(3),
                'due_date' => now()->addMonths(21),
                'budget' => 250000.00,
                'spent' => 87500.00,
                'sla_hours' => 24,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-004',
                'title' => 'Retail Chain Climate Control',
                'description' => 'HVAC and climate control maintenance for 15 retail locations. Includes quarterly inspections and emergency support.',
                'client_id' => $users[1]->id,
                'assigned_to' => null,
                'status' => 'approved',
                'priority' => 'medium',
                'start_date' => now()->addMonths(1),
                'due_date' => now()->addMonths(13),
                'budget' => 85000.00,
                'spent' => 0.00,
                'sla_hours' => 144,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-005',
                'title' => 'Data Center Cooling Systems',
                'description' => '24/7 monitoring and maintenance of advanced data center cooling infrastructure. Redundant systems and emergency backup protocols.',
                'client_id' => $users[2]->id,
                'assigned_to' => $users[0]->id,
                'status' => 'done',
                'priority' => 'critical',
                'start_date' => now()->subMonths(12),
                'due_date' => now()->subDays(5),
                'budget' => 180000.00,
                'spent' => 180000.00,
                'completed_at' => now()->subDays(5),
                'sla_hours' => 12,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-006',
                'title' => 'Airport Security Camera Expansion',
                'description' => 'New camera coverage for cargo and perimeter zones, waiting for final customer sign-off.',
                'client_id' => $users[0]->id,
                'assigned_to' => null,
                'status' => 'draft',
                'priority' => 'medium',
                'start_date' => $now->copy()->addWeeks(2),
                'due_date' => $now->copy()->addMonths(6),
                'budget' => 92000.00,
                'spent' => 0.00,
                'sla_hours' => 72,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-007',
                'title' => 'Factory Access Control Retrofit',
                'description' => 'Badge reader and turnstile retrofit paused due to missing hardware shipment.',
                'client_id' => $users[1]->id,
                'assigned_to' => $users[2]->id,
                'status' => 'blocked',
                'priority' => 'high',
                'start_date' => $now->copy()->subWeeks(3),
                'due_date' => $now->copy()->addWeeks(4),
                'budget' => 64000.00,
                'spent' => 18000.00,
                'sla_hours' => 48,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-008',
                'title' => 'Warehouse IoT Sensor Grid',
                'description' => 'Sensor rollout for humidity and temperature monitoring in cold storage lanes.',
                'client_id' => $users[2]->id,
                'assigned_to' => $users[0]->id,
                'status' => 'in_progress',
                'priority' => 'high',
                'start_date' => $now->copy()->subMonths(1),
                'due_date' => $now->copy()->subDays(2),
                'budget' => 73000.00,
                'spent' => 52500.00,
                'sla_hours' => 36,
            ],
            [
                'tenant_id' => $tenant->id,
                'contract_number' => 'CT-2026-009',
                'title' => 'Municipal Building BMS Upgrade',
                'description' => 'Upgrade building management system and remote monitoring integrations.',
                'client_id' => $users[0]->id,
                'assigned_to' => $users[1]->id,
                'status' => 'approved',
                'priority' => 'medium',
                'start_date' => $now->copy()->subWeek(),
                'due_date' => $now->copy()->addDays(14),
                'budget' => 110000.00,
                'spent' => 19000.00,
                'sla_hours' => 60,
            ],
        ];

        foreach ($contracts as $contract) {
            Contract::updateOrCreate(
                [
                    'tenant_id' => $contract['tenant_id'],
                    'contract_number' => $contract['contract_number'],
                ],
                $contract
            );
        }
    }
}
