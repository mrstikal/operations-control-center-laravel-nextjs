<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('status', 'active')
            ->orderBy('id')
            ->first();
        if (! $tenant) {
            return;
        }

        // Departments are global in newer schema; keep compatibility with older tenant-scoped schema.
        $departmentsQuery = DB::table('departments');
        if (Schema::hasColumn('departments', 'tenant_id')) {
            $departmentsQuery->where('tenant_id', $tenant->id);
        }

        $departmentIds = $departmentsQuery
            ->pluck('id', 'name')
            ->toArray();

        $employeeUsers = [
            [
                'name' => 'John Martinez',
                'email' => 'john.martinez@occ.local',
                'position' => 'Senior HVAC Technician',
                'department_id' => $departmentIds['Field Operations'] ?? null,
                'hire_date' => '2018-02-12',
                'skills' => ['HVAC Installation', 'HVAC Repair', 'System Diagnosis'],
                'certifications' => ['EPA Level 2', 'Commercial HVAC'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Sarah Johnson',
                'email' => 'sarah.johnson@occ.local',
                'position' => 'Network Infrastructure Specialist',
                'department_id' => $departmentIds['Technical Services'] ?? null,
                'hire_date' => '2020-04-08',
                'skills' => ['Network Design', 'Cisco Equipment', 'Network Security'],
                'certifications' => ['Cisco CCNP', 'CompTIA Network+'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Michael Chen',
                'email' => 'michael.chen@occ.local',
                'position' => 'Emergency Response Coordinator',
                'department_id' => $departmentIds['Emergency Services'] ?? null,
                'hire_date' => '2022-01-10',
                'skills' => ['Emergency Response', 'Crisis Management', 'Escalation'],
                'certifications' => ['NFPA 72', 'Emergency Management'],
                'available_hours_per_week' => 42,
            ],
            [
                'name' => 'Emily Rodriguez',
                'email' => 'emily.rodriguez@occ.local',
                'position' => 'Preventive Maintenance Technician',
                'department_id' => $departmentIds['Field Operations'] ?? null,
                'hire_date' => '2023-03-20',
                'skills' => ['Mechanical Systems', 'Preventive Maintenance', 'Equipment Testing'],
                'certifications' => ['HVACR Level 1', 'Basic Electrical'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Robert Williams',
                'email' => 'robert.williams@occ.local',
                'position' => 'Operations Manager',
                'department_id' => $departmentIds['Management'] ?? null,
                'hire_date' => '2019-06-17',
                'skills' => ['Operations Management', 'Team Leadership', 'Project Coordination'],
                'certifications' => ['PMP Certified', 'Six Sigma Green Belt'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Jessica Thompson',
                'email' => 'jessica.thompson@occ.local',
                'position' => 'Data Center Specialist',
                'department_id' => $departmentIds['Technical Services'] ?? null,
                'hire_date' => '2021-09-13',
                'skills' => ['Cooling Systems', 'Power Infrastructure', 'Data Center Operations'],
                'certifications' => ['CompTIA Security+', 'Data Center Management'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'David Anderson',
                'email' => 'david.anderson@occ.local',
                'position' => 'Apprentice Technician',
                'department_id' => $departmentIds['Field Operations'] ?? null,
                'hire_date' => '2025-09-01',
                'skills' => ['General Maintenance', 'Equipment Assembly', 'Basic Repairs'],
                'certifications' => ['In Training'],
                'available_hours_per_week' => 38,
            ],
            [
                'name' => 'Priya Nair',
                'email' => 'priya.nair@occ.local',
                'position' => 'Site Reliability Engineer',
                'department_id' => $departmentIds['Technical Services'] ?? null,
                'hire_date' => '2021-02-01',
                'skills' => ['Observability', 'Scripting', 'Incident Triage'],
                'certifications' => ['AWS SysOps', 'CKA'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Lucas Novak',
                'email' => 'lucas.novak@occ.local',
                'position' => 'Field Service Technician',
                'department_id' => $departmentIds['Field Operations'] ?? null,
                'hire_date' => '2022-07-11',
                'skills' => ['On-site Diagnostics', 'Asset Replacement', 'Preventive Checks'],
                'certifications' => ['Electrical Safety', 'Forklift Operator'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Anna Svobodova',
                'email' => 'anna.svobodova@occ.local',
                'position' => 'Service Desk Lead',
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'hire_date' => '2020-11-09',
                'skills' => ['ITIL Process', 'Dispatch Coordination', 'Client Communication'],
                'certifications' => ['ITIL 4 Foundation', 'Lean Fundamentals'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Marek Dvorak',
                'email' => 'marek.dvorak@occ.local',
                'position' => 'Contract Analyst',
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'hire_date' => '2021-05-03',
                'skills' => ['SLA Monitoring', 'Reporting', 'Vendor Coordination'],
                'certifications' => ['PRINCE2 Foundation'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Petra Kralova',
                'email' => 'petra.kralova@occ.local',
                'position' => 'Asset Lifecycle Specialist',
                'department_id' => $departmentIds['Asset Management'] ?? null,
                'hire_date' => '2022-03-14',
                'skills' => ['Asset Inventory', 'Lifecycle Planning', 'Warranty Tracking'],
                'certifications' => ['ISO 55001 Fundamentals'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Tomas Havel',
                'email' => 'tomas.havel@occ.local',
                'position' => 'Safety Compliance Officer',
                'department_id' => $departmentIds['Emergency Services'] ?? null,
                'hire_date' => '2019-10-21',
                'skills' => ['HSE Compliance', 'Audit Readiness', 'Root Cause Analysis'],
                'certifications' => ['NEBOSH General', 'First Aid Instructor'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Linda Park',
                'email' => 'linda.park@occ.local',
                'position' => 'Maintenance Planner',
                'department_id' => $departmentIds['Field Operations'] ?? null,
                'hire_date' => '2020-08-17',
                'skills' => ['PM Scheduling', 'Parts Planning', 'Work Order Prioritization'],
                'certifications' => ['CMRP'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Ahmed El-Sayed',
                'email' => 'ahmed.elsayed@occ.local',
                'position' => 'Electrical Systems Engineer',
                'department_id' => $departmentIds['Technical Services'] ?? null,
                'hire_date' => '2018-12-03',
                'skills' => ['Power Distribution', 'UPS Systems', 'Electrical Diagnostics'],
                'certifications' => ['Licensed Electrician', 'NFPA 70E'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Natalia Gomez',
                'email' => 'natalia.gomez@occ.local',
                'position' => 'Quality Assurance Coordinator',
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'hire_date' => '2023-01-16',
                'skills' => ['Process QA', 'Checklist Governance', 'Audit Sampling'],
                'certifications' => ['ISO 9001 Internal Auditor'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Erik Lund',
                'email' => 'erik.lund@occ.local',
                'position' => 'Incident Commander',
                'department_id' => $departmentIds['Emergency Services'] ?? null,
                'hire_date' => '2017-04-10',
                'skills' => ['Incident Command', 'Escalation Strategy', 'Cross-Team Coordination'],
                'certifications' => ['ICS-300', 'Business Continuity'],
                'available_hours_per_week' => 42,
            ],
            [
                'name' => 'Sophie Martin',
                'email' => 'sophie.martin@occ.local',
                'position' => 'Client Success Operations Lead',
                'department_id' => $departmentIds['Management'] ?? null,
                'hire_date' => '2020-06-01',
                'skills' => ['Stakeholder Management', 'Service Reviews', 'Renewal Planning'],
                'certifications' => ['CSM', 'ITIL 4 Specialist'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Daniel Kim',
                'email' => 'daniel.kim@occ.local',
                'position' => 'Platform Operations Engineer',
                'department_id' => $departmentIds['Technical Services'] ?? null,
                'hire_date' => '2022-05-09',
                'skills' => ['Linux Administration', 'Automation', 'Performance Tuning'],
                'certifications' => ['RHCSA', 'Terraform Associate'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Veronika Blaha',
                'email' => 'veronika.blaha@occ.local',
                'position' => 'Dispatch Coordinator',
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'hire_date' => '2024-02-05',
                'skills' => ['Dispatch Operations', 'Shift Coordination', 'Communication'],
                'certifications' => ['Lean Service Operations'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Jakub Prochazka',
                'email' => 'jakub.prochazka@occ.local',
                'position' => 'Asset Maintenance Technician',
                'department_id' => $departmentIds['Asset Management'] ?? null,
                'hire_date' => '2023-09-04',
                'skills' => ['Asset Inspection', 'Repair Planning', 'Spare Parts Handling'],
                'certifications' => ['Maintenance Fundamentals'],
                'available_hours_per_week' => 40,
            ],
            [
                'name' => 'Martina Horakova',
                'email' => 'martina.horakova@occ.local',
                'position' => 'Operations Reporting Specialist',
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'hire_date' => '2021-11-15',
                'skills' => ['KPI Reporting', 'Dashboard Design', 'Data Validation'],
                'certifications' => ['Power BI Data Analyst'],
                'available_hours_per_week' => 40,
            ],
        ];

        $profileByEmail = [];

        $userMetaByEmail = [
            'superadmin@test.local' => ['employee_id' => 'ACM-0001', 'phone' => '+420 601 100 001', 'bio' => 'Platform superadmin responsible for tenant governance and security posture.'],
            'admin@test.local' => ['employee_id' => 'ACM-0002', 'phone' => '+420 601 100 002', 'bio' => 'Tenant administrator coordinating daily operations and access control.'],
            'manager@test.local' => ['employee_id' => 'ACM-0003', 'phone' => '+420 601 100 003', 'bio' => 'Operations manager overseeing SLA delivery and team capacity.'],
            'tech@test.local' => ['employee_id' => 'ACM-0004', 'phone' => '+420 601 100 004', 'bio' => 'Senior technician focused on field diagnostics and issue resolution.'],
            'viewer@test.local' => ['employee_id' => 'ACM-0005', 'phone' => '+420 601 100 005', 'bio' => 'Read-only reporting user for operational visibility.'],
            'viewer-management@test.local' => ['employee_id' => 'ACM-0006', 'phone' => '+420 601 100 006', 'bio' => 'Management viewer for strategic reporting and KPI oversight.'],
            'viewer-auditor@test.local' => ['employee_id' => 'ACM-0007', 'phone' => '+420 601 100 007', 'bio' => 'Audit viewer focused on compliance checks and traceability.'],
            'viewer-client@test.local' => ['employee_id' => 'ACM-0008', 'phone' => '+420 601 100 008', 'bio' => 'Client-facing viewer with access to owned service areas.'],

            'john.martinez@occ.local' => ['employee_id' => 'ACM-0101', 'phone' => '+420 602 200 101', 'bio' => 'Leads complex HVAC interventions across priority sites.'],
            'sarah.johnson@occ.local' => ['employee_id' => 'ACM-0102', 'phone' => '+420 602 200 102', 'bio' => 'Designs and stabilizes critical network infrastructure.'],
            'michael.chen@occ.local' => ['employee_id' => 'ACM-0103', 'phone' => '+420 602 200 103', 'bio' => 'Coordinates emergency response and escalation workflows.'],
            'emily.rodriguez@occ.local' => ['employee_id' => 'ACM-0104', 'phone' => '+420 602 200 104', 'bio' => 'Executes preventive maintenance plans for field assets.'],
            'robert.williams@occ.local' => ['employee_id' => 'ACM-0105', 'phone' => '+420 602 200 105', 'bio' => 'Drives operations strategy and multi-team coordination.'],
            'jessica.thompson@occ.local' => ['employee_id' => 'ACM-0106', 'phone' => '+420 602 200 106', 'bio' => 'Maintains data center reliability and capacity planning.'],
            'david.anderson@occ.local' => ['employee_id' => 'ACM-0107', 'phone' => '+420 602 200 107', 'bio' => 'Apprentice technician supporting maintenance execution.'],
            'priya.nair@occ.local' => ['employee_id' => 'ACM-0108', 'phone' => '+420 602 200 108', 'bio' => 'SRE ensuring observability and production stability.'],
            'lucas.novak@occ.local' => ['employee_id' => 'ACM-0109', 'phone' => '+420 602 200 109', 'bio' => 'Field specialist for on-site diagnostics and remediation.'],
            'anna.svobodova@occ.local' => ['employee_id' => 'ACM-0110', 'phone' => '+420 602 200 110', 'bio' => 'Leads service desk dispatch and customer communication.'],
            'marek.dvorak@occ.local' => ['employee_id' => 'ACM-0111', 'phone' => '+420 602 200 111', 'bio' => 'Analyzes contract SLA performance and reporting trends.'],
            'petra.kralova@occ.local' => ['employee_id' => 'ACM-0112', 'phone' => '+420 602 200 112', 'bio' => 'Owns asset lifecycle controls and planning.'],
            'tomas.havel@occ.local' => ['employee_id' => 'ACM-0113', 'phone' => '+420 602 200 113', 'bio' => 'Monitors safety and compliance standards across operations.'],
            'linda.park@occ.local' => ['employee_id' => 'ACM-0114', 'phone' => '+420 602 200 114', 'bio' => 'Plans preventive maintenance backlog and scheduling.'],
            'ahmed.elsayed@occ.local' => ['employee_id' => 'ACM-0115', 'phone' => '+420 602 200 115', 'bio' => 'Electrical systems engineer for critical power environments.'],
            'natalia.gomez@occ.local' => ['employee_id' => 'ACM-0116', 'phone' => '+420 602 200 116', 'bio' => 'Coordinates quality assurance and process compliance.'],
            'erik.lund@occ.local' => ['employee_id' => 'ACM-0117', 'phone' => '+420 602 200 117', 'bio' => 'Incident commander for high-priority escalations.'],
            'sophie.martin@occ.local' => ['employee_id' => 'ACM-0118', 'phone' => '+420 602 200 118', 'bio' => 'Client success lead for service review governance.'],
            'daniel.kim@occ.local' => ['employee_id' => 'ACM-0119', 'phone' => '+420 602 200 119', 'bio' => 'Platform engineer focused on automation and reliability.'],
            'veronika.blaha@occ.local' => ['employee_id' => 'ACM-0120', 'phone' => '+420 602 200 120', 'bio' => 'Dispatch coordinator balancing daily operational load.'],
            'jakub.prochazka@occ.local' => ['employee_id' => 'ACM-0121', 'phone' => '+420 602 200 121', 'bio' => 'Technician dedicated to asset maintenance lifecycle.'],
            'martina.horakova@occ.local' => ['employee_id' => 'ACM-0122', 'phone' => '+420 602 200 122', 'bio' => 'Reporting specialist for KPI quality and insights.'],
        ];

        $seedPasswordHash = bcrypt((string) env('EMPLOYEE_SEEDER_PASSWORD', 'password'));

        foreach ($employeeUsers as $emp) {
            $meta = $userMetaByEmail[$emp['email']] ?? ['employee_id' => null, 'phone' => null, 'bio' => null];
            $user = User::firstOrCreate(
                ['email' => $emp['email']],
                [
                    'name' => $emp['name'],
                    'password' => $seedPasswordHash,
                    'tenant_id' => $tenant->id,
                    'status' => 'active',
                    'employee_id' => $meta['employee_id'],
                    'phone' => $meta['phone'],
                    'bio' => $meta['bio'],
                ]
            );

            $user->forceFill([
                'tenant_id' => $tenant->id,
                'status' => 'active',
                'employee_id' => $meta['employee_id'] ?? $user->employee_id,
                'phone' => $meta['phone'] ?? $user->phone,
                'bio' => $meta['bio'] ?? $user->bio,
            ])->save();

            $profileByEmail[$emp['email']] = $emp;
        }

        // Profiles for deterministic dashboard RBAC test users.
        $profileByEmail['superadmin@test.local'] = [
            'department_id' => $departmentIds['Management'] ?? null,
            'position' => 'Platform Superadmin',
            'hire_date' => '2016-01-04',
            'skills' => ['System Governance', 'Tenant Architecture', 'Security Oversight'],
            'certifications' => ['ISO 27001 Lead Implementer'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['admin@test.local'] = [
            'department_id' => $departmentIds['Management'] ?? null,
            'position' => 'Tenant Administrator',
            'hire_date' => '2018-03-12',
            'skills' => ['Tenant Administration', 'Access Governance', 'Audit Coordination'],
            'certifications' => ['ITIL 4 Managing Professional'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['manager@test.local'] = [
            'department_id' => $departmentIds['Operations Control'] ?? null,
            'position' => 'Operations Manager',
            'hire_date' => '2019-09-02',
            'skills' => ['Team Leadership', 'SLA Management', 'Capacity Planning'],
            'certifications' => ['PMP Certified'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['tech@test.local'] = [
            'department_id' => $departmentIds['Field Operations'] ?? null,
            'position' => 'Senior Field Technician',
            'hire_date' => '2021-01-18',
            'skills' => ['Field Diagnostics', 'Incident Resolution', 'Maintenance'],
            'certifications' => ['CompTIA A+'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['viewer@test.local'] = [
            'department_id' => $departmentIds['Operations Control'] ?? null,
            'position' => 'Reporting Viewer',
            'hire_date' => '2022-04-04',
            'skills' => ['Operational Reporting', 'Dashboard Review'],
            'certifications' => ['Data Literacy Fundamentals'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['viewer-management@test.local'] = [
            'department_id' => $departmentIds['Management'] ?? null,
            'position' => 'Management Observer',
            'hire_date' => '2021-07-05',
            'skills' => ['Portfolio Visibility', 'Executive Reporting'],
            'certifications' => ['Strategic Portfolio Management'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['viewer-auditor@test.local'] = [
            'department_id' => $departmentIds['Operations Control'] ?? null,
            'position' => 'Compliance Auditor',
            'hire_date' => '2020-10-12',
            'skills' => ['Compliance Review', 'Audit Trails', 'Control Testing'],
            'certifications' => ['ISO 19011 Lead Auditor'],
            'available_hours_per_week' => 40,
        ];
        $profileByEmail['viewer-client@test.local'] = [
            'department_id' => $departmentIds['Operations Control'] ?? null,
            'position' => 'Client Stakeholder',
            'hire_date' => '2023-06-19',
            'skills' => ['Client Communications', 'Service Review'],
            'certifications' => ['Customer Success Fundamentals'],
            'available_hours_per_week' => 40,
        ];

        // Ensure every user has a profile and key contact fields.
        $users = User::where('tenant_id', $tenant->id)->get();
        foreach ($users as $user) {
            $meta = $userMetaByEmail[$user->email] ?? [
                'employee_id' => sprintf('ACM-%04d', $user->id),
                'phone' => '+420 603 300 '.str_pad((string) ($user->id % 1000), 3, '0', STR_PAD_LEFT),
                'bio' => 'Operations team member supporting service continuity and reporting.',
            ];

            $user->forceFill([
                'employee_id' => $user->employee_id ?: $meta['employee_id'],
                'phone' => $user->phone ?: $meta['phone'],
                'bio' => $user->bio ?: $meta['bio'],
                'status' => $user->status,
            ])->save();

            $profile = $profileByEmail[$user->email] ?? [
                'department_id' => $departmentIds['Operations Control'] ?? null,
                'position' => 'Operations Specialist',
                'hire_date' => '2024-01-15',
                'skills' => ['Operations Support', 'Ticket Coordination'],
                'certifications' => ['Operations Foundation'],
                'available_hours_per_week' => 40,
            ];

            DB::table('employee_profiles')->updateOrInsert(
                ['user_id' => $user->id],
                [
                    'department_id' => $profile['department_id'],
                    'position' => $profile['position'],
                    'hire_date' => $profile['hire_date'],
                    'skills' => json_encode($profile['skills']),
                    'certifications' => json_encode($profile['certifications']),
                    'available_hours_per_week' => $profile['available_hours_per_week'],
                    'utilization_percent' => 0,
                    'availability_status' => 'available',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
