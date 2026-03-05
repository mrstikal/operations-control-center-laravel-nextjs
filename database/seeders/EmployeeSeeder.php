<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();
        if (!$tenant) return;

        $employees = [
            [
                'name' => 'John Martinez',
                'email' => 'john.martinez@occ.local',
                'position' => 'Senior HVAC Technician',
                'department' => 'Field Operations',
                'hire_date' => now()->subYears(8),
                'skills' => ['HVAC Installation', 'HVAC Repair', 'System Diagnosis'],
                'certifications' => ['EPA Level 2', 'Commercial HVAC'],
            ],
            [
                'name' => 'Sarah Johnson',
                'email' => 'sarah.johnson@occ.local',
                'position' => 'Network Infrastructure Specialist',
                'department' => 'Technical Services',
                'hire_date' => now()->subYears(5),
                'skills' => ['Network Design', 'Cisco Equipment', 'Network Security'],
                'certifications' => ['Cisco CCNP', 'CompTIA Network+'],
            ],
            [
                'name' => 'Michael Chen',
                'email' => 'michael.chen@occ.local',
                'position' => 'Emergency Response Coordinator',
                'department' => 'Emergency Services',
                'hire_date' => now()->subYears(3),
                'skills' => ['Emergency Response', 'Crisis Management', 'Escalation'],
                'certifications' => ['NFPA 72', 'Emergency Management'],
            ],
            [
                'name' => 'Emily Rodriguez',
                'email' => 'emily.rodriguez@occ.local',
                'position' => 'Preventive Maintenance Technician',
                'department' => 'Field Operations',
                'hire_date' => now()->subYears(2),
                'skills' => ['Mechanical Systems', 'Preventive Maintenance', 'Equipment Testing'],
                'certifications' => ['HVACR Level 1', 'Basic Electrical'],
            ],
            [
                'name' => 'Robert Williams',
                'email' => 'robert.williams@occ.local',
                'position' => 'Operations Manager',
                'department' => 'Management',
                'hire_date' => now()->subYears(6),
                'skills' => ['Operations Management', 'Team Leadership', 'Project Coordination'],
                'certifications' => ['PMP Certified', 'Six Sigma Green Belt'],
            ],
            [
                'name' => 'Jessica Thompson',
                'email' => 'jessica.thompson@occ.local',
                'position' => 'Data Center Specialist',
                'department' => 'Technical Services',
                'hire_date' => now()->subYears(4),
                'skills' => ['Cooling Systems', 'Power Infrastructure', 'Data Center Operations'],
                'certifications' => ['CompTIA Security+', 'Data Center Management'],
            ],
            [
                'name' => 'David Anderson',
                'email' => 'david.anderson@occ.local',
                'position' => 'Apprentice Technician',
                'department' => 'Field Operations',
                'hire_date' => now()->subMonths(6),
                'skills' => ['General Maintenance', 'Equipment Assembly', 'Basic Repairs'],
                'certifications' => ['In Training'],
            ],
        ];

        foreach ($employees as $emp) {
            // Create user
            $user = User::firstOrCreate(
                ['email' => $emp['email']],
                [
                    'name' => $emp['name'],
                    'password' => bcrypt('password'),
                    'tenant_id' => $tenant->id,
                ]
            );

            // Create employee_profile
            DB::table('employee_profiles')->updateOrInsert(
                ['user_id' => $user->id],
                [
                    'tenant_id' => $tenant->id,
                    'department' => $emp['department'],
                    'position' => $emp['position'],
                    'hire_date' => $emp['hire_date'],
                    'skills' => json_encode($emp['skills']),
                    'certifications' => json_encode($emp['certifications']),
                    'available_hours_per_week' => 40,
                    'utilization_percent' => 0,
                    'availability_status' => 'available',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}

