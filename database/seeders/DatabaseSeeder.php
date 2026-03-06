<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Delete old Default Tenant if exists
        Tenant::where('name', 'Default Tenant')->forceDelete();

        // Create production-ready tenants
        $tenants = [
            [
                'name' => 'Acme Corporation',
                'description' => 'Global manufacturing and logistics enterprise with operations across North America and Europe.',
                'status' => 'active',
                'metadata' => [
                    'industry' => 'Manufacturing',
                    'employee_count' => 5000,
                    'locations' => ['New York', 'London', 'Frankfurt'],
                    'primary_contact' => 'operations@acme-corp.com',
                ],
            ],
            [
                'name' => 'TechVision Solutions',
                'description' => 'Leading IT services and cloud infrastructure provider specializing in enterprise solutions.',
                'status' => 'active',
                'metadata' => [
                    'industry' => 'Technology',
                    'employee_count' => 1200,
                    'locations' => ['San Francisco', 'Austin', 'Seattle'],
                    'primary_contact' => 'support@techvision.io',
                ],
            ],
            [
                'name' => 'HealthCare Plus',
                'description' => 'Multi-facility healthcare network providing comprehensive medical services and emergency care.',
                'status' => 'active',
                'metadata' => [
                    'industry' => 'Healthcare',
                    'employee_count' => 3500,
                    'locations' => ['Boston', 'Chicago', 'Miami'],
                    'primary_contact' => 'facilities@healthcareplus.org',
                ],
            ],
            [
                'name' => 'GreenErgy Systems',
                'description' => 'Renewable energy infrastructure company managing solar and wind installations nationwide.',
                'status' => 'active',
                'metadata' => [
                    'industry' => 'Energy',
                    'employee_count' => 800,
                    'locations' => ['Denver', 'Phoenix', 'Portland'],
                    'primary_contact' => 'ops@greenergy.com',
                ],
            ],
            [
                'name' => 'Global Logistics Partners',
                'description' => 'International freight and supply chain management company with worldwide distribution network.',
                'status' => 'active',
                'metadata' => [
                    'industry' => 'Logistics',
                    'employee_count' => 2200,
                    'locations' => ['Los Angeles', 'Houston', 'Atlanta'],
                    'primary_contact' => 'dispatch@globallogistics.net',
                ],
            ],
        ];

        $createdTenants = [];
        foreach ($tenants as $tenantData) {
            $createdTenants[] = Tenant::firstOrCreate(
                ['name' => $tenantData['name']],
                $tenantData
            );
        }

        // Use first tenant for test users (Acme Corporation)
        $tenant = $createdTenants[0];

        // Deterministic test logins for dashboard RBAC comparison
        // Roles are assigned via RoleAndPermissionSeeder, not via users.role column
        $users = [
            [
                'email' => 'superadmin@test.local',
                'name' => 'Superadmin User',
                'employee_id' => 'ACM-0001',
                'phone' => '+420 601 100 001',
                'bio' => 'Platform superadmin responsible for tenant governance and security posture.',
            ],
            [
                'email' => 'admin@test.local',
                'name' => 'Admin User',
                'employee_id' => 'ACM-0002',
                'phone' => '+420 601 100 002',
                'bio' => 'Tenant administrator coordinating daily operations and access control.',
            ],
            [
                'email' => 'manager@test.local',
                'name' => 'Manager User',
                'employee_id' => 'ACM-0003',
                'phone' => '+420 601 100 003',
                'bio' => 'Operations manager overseeing SLA delivery and team capacity.',
            ],
            [
                'email' => 'tech@test.local',
                'name' => 'Technician User',
                'employee_id' => 'ACM-0004',
                'phone' => '+420 601 100 004',
                'bio' => 'Senior technician focused on diagnostics and field operations.',
            ],
            [
                'email' => 'viewer@test.local',
                'name' => 'Viewer User',
                'employee_id' => 'ACM-0005',
                'phone' => '+420 601 100 005',
                'bio' => 'Read-only reporting user for operational visibility.',
            ],
            [
                'email' => 'viewer-management@test.local',
                'name' => 'Viewer-Management User',
                'employee_id' => 'ACM-0006',
                'phone' => '+420 601 100 006',
                'bio' => 'Management viewer for strategic reporting and KPI oversight.',
            ],
            [
                'email' => 'viewer-auditor@test.local',
                'name' => 'Viewer-Auditor User',
                'employee_id' => 'ACM-0007',
                'phone' => '+420 601 100 007',
                'bio' => 'Audit viewer focused on compliance checks and traceability.',
            ],
            [
                'email' => 'viewer-client@test.local',
                'name' => 'Viewer-Client User',
                'employee_id' => 'ACM-0008',
                'phone' => '+420 601 100 008',
                'bio' => 'Client-facing viewer with access to owned service areas.',
            ],
        ];

        $seedPasswordHash = bcrypt((string) env('EMPLOYEE_SEEDER_PASSWORD', 'password'));

        foreach ($users as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'tenant_id' => $tenant->id,
                    'name' => $userData['name'],
                    'password' => $seedPasswordHash,
                    'status' => 'active',
                    'employee_id' => $userData['employee_id'],
                    'phone' => $userData['phone'],
                    'bio' => $userData['bio'],
                ]
            );
        }

        // Create roles & permissions AFTER users exist
        // (so RoleAndPermissionSeeder can find and assign roles to users)
        $this->call([
            RoleAndPermissionSeeder::class,
        ]);

        // Data seeders
        $this->call([
            ContractSeeder::class,
            IncidentSeeder::class,
            AssetSeeder::class,
            MaintenanceScheduleSeeder::class,
            MaintenanceLogSeeder::class,
            NotificationScheduleSeeder::class,
            NotificationSeeder::class,
            AssetAuditTrailSeeder::class,
            DepartmentSeeder::class,
            EmployeeSeeder::class,
            ShiftSeeder::class,
            EmployeeShiftSeeder::class,
            TimeOffRequestSeeder::class,
            WorkloadSeeder::class,
            EventSeeder::class,
            EventProjectionsSeeder::class,
            EventSnapshotsSeeder::class,
        ]);
    }
}
