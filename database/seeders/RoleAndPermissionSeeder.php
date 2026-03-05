<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 5 roles with granular permissions
     */
    public function run(): void
    {
        // Získání prvního tenanta (test-company)
        $tenant = Tenant::where('slug', 'test-company')->first();

        if (!$tenant) {
            $this->command->warn('No test tenant found. Run DatabaseSeeder first.');
            return;
        }

        // Definice permissí (rozšířená struktura)
        $permissionsData = [
            // Contracts (6)
            ['resource' => 'contracts', 'action' => 'view', 'description' => 'View contracts'],
            ['resource' => 'contracts', 'action' => 'create', 'description' => 'Create contracts'],
            ['resource' => 'contracts', 'action' => 'edit', 'description' => 'Edit contracts'],
            ['resource' => 'contracts', 'action' => 'delete', 'description' => 'Delete contracts'],
            ['resource' => 'contracts', 'action' => 'approve', 'description' => 'Approve contracts'],
            ['resource' => 'contracts', 'action' => 'change_status', 'description' => 'Change contract status'],

            // Assets (6)
            ['resource' => 'assets', 'action' => 'view', 'description' => 'View assets'],
            ['resource' => 'assets', 'action' => 'create', 'description' => 'Create assets'],
            ['resource' => 'assets', 'action' => 'edit', 'description' => 'Edit assets'],
            ['resource' => 'assets', 'action' => 'delete', 'description' => 'Delete assets'],
            ['resource' => 'assets', 'action' => 'log_maintenance', 'description' => 'Log maintenance'],
            ['resource' => 'assets', 'action' => 'schedule_maintenance', 'description' => 'Schedule maintenance'],

            // Incidents (6)
            ['resource' => 'incidents', 'action' => 'view', 'description' => 'View incidents'],
            ['resource' => 'incidents', 'action' => 'create', 'description' => 'Create incidents'],
            ['resource' => 'incidents', 'action' => 'edit', 'description' => 'Edit incidents'],
            ['resource' => 'incidents', 'action' => 'delete', 'description' => 'Delete incidents'],
            ['resource' => 'incidents', 'action' => 'escalate', 'description' => 'Escalate incidents'],
            ['resource' => 'incidents', 'action' => 'close', 'description' => 'Close incidents'],

            // Users/HR (5)
            ['resource' => 'users', 'action' => 'view', 'description' => 'View users'],
            ['resource' => 'users', 'action' => 'create', 'description' => 'Create users'],
            ['resource' => 'users', 'action' => 'edit', 'description' => 'Edit users'],
            ['resource' => 'users', 'action' => 'delete', 'description' => 'Delete users'],
            ['resource' => 'users', 'action' => 'assign_role', 'description' => 'Assign roles to users'],

            // HR Operations (4)
            ['resource' => 'hr', 'action' => 'view_employees', 'description' => 'View employees'],
            ['resource' => 'hr', 'action' => 'manage_shifts', 'description' => 'Manage shifts'],
            ['resource' => 'hr', 'action' => 'approve_timeoff', 'description' => 'Approve time-off requests'],
            ['resource' => 'hr', 'action' => 'manage_workload', 'description' => 'Manage workload'],

            // Reports (3)
            ['resource' => 'reports', 'action' => 'view', 'description' => 'View reports'],
            ['resource' => 'reports', 'action' => 'export', 'description' => 'Export reports'],
            ['resource' => 'reports', 'action' => 'create', 'description' => 'Create custom reports'],

            // Settings (3)
            ['resource' => 'settings', 'action' => 'view', 'description' => 'View settings'],
            ['resource' => 'settings', 'action' => 'edit', 'description' => 'Edit settings'],
            ['resource' => 'settings', 'action' => 'manage_roles', 'description' => 'Manage roles and permissions'],

            // System (3)
            ['resource' => 'system', 'action' => 'view_audit_logs', 'description' => 'View audit logs'],
            ['resource' => 'system', 'action' => 'manage_tenants', 'description' => 'Manage tenants'],
            ['resource' => 'system', 'action' => 'system_config', 'description' => 'System configuration'],
        ];

        // Vytvoření permissí
        $permissions = [];
        foreach ($permissionsData as $data) {
            $permission = Permission::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'resource' => $data['resource'],
                    'action' => $data['action'],
                ],
                [
                    'name' => "{$data['resource']}.{$data['action']}",
                    'description' => $data['description'] ?? "Permission to {$data['action']} {$data['resource']}",
                ]
            );
            $permissions[] = $permission;
        }

        $this->command->info("✓ {$permissions->count()} Permissions created successfully");

        // ========== ROLE: SUPERADMIN (Level 5) ==========
        $superadminRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Superadmin'],
            [
                'description' => 'System administrator - Full access',
                'level' => 5,
                'is_system' => true,
                'metadata' => [
                    'color' => '#FF0000',
                    'icon' => 'crown',
                    'order' => 1,
                ],
            ]
        );
        // All permissions
        $superadminRole->permissions()->sync(collect($permissions)->pluck('id'));
        $roles['superadmin'] = $superadminRole;
        $this->command->line('  ✓ Superadmin role created');

        // ========== ROLE: ADMIN (Level 4) ==========
        $adminPermissions = collect($permissions)->filter(function ($p) {
            // Admin má všechno KROMĚ system management
            return !in_array($p->resource, ['system'])
                || $p->action !== 'manage_tenants';
        });
        $adminRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Admin'],
            [
                'description' => 'Tenant administrator - Tenant-wide access',
                'level' => 4,
                'is_system' => true,
                'metadata' => [
                    'color' => '#FF6B6B',
                    'icon' => 'shield-admin',
                    'order' => 2,
                ],
            ]
        );
        $adminRole->permissions()->sync($adminPermissions->pluck('id'));
        $roles['admin'] = $adminRole;
        $this->command->line('  ✓ Admin role created');

        // ========== ROLE: MANAGER (Level 3) ==========
        $managerPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                // Contracts - full
                'contracts.view', 'contracts.create', 'contracts.edit', 'contracts.approve', 'contracts.change_status',
                // Assets - view, create, edit, maintenance
                'assets.view', 'assets.create', 'assets.edit', 'assets.log_maintenance', 'assets.schedule_maintenance',
                // Incidents - full
                'incidents.view', 'incidents.create', 'incidents.edit', 'incidents.escalate', 'incidents.close',
                // Users - view, create, edit
                'users.view', 'users.create', 'users.edit',
                // HR - full
                'hr.view_employees', 'hr.manage_shifts', 'hr.approve_timeoff', 'hr.manage_workload',
                // Reports - view, export, create
                'reports.view', 'reports.export', 'reports.create',
                // Settings - view only
                'settings.view',
            ];
            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $managerRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Manager'],
            [
                'description' => 'Department manager - Management access',
                'level' => 3,
                'is_system' => true,
                'metadata' => [
                    'color' => '#FFA500',
                    'icon' => 'shield-manager',
                    'order' => 3,
                ],
            ]
        );
        $managerRole->permissions()->sync($managerPermissions->pluck('id'));
        $roles['manager'] = $managerRole;
        $this->command->line('  ✓ Manager role created');

        // ========== ROLE: TECHNICIAN (Level 2) ==========
        $technicianPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                // Contracts - view, edit, change_status
                'contracts.view', 'contracts.edit', 'contracts.change_status',
                // Assets - view, log_maintenance
                'assets.view', 'assets.log_maintenance',
                // Incidents - view, edit, escalate, close
                'incidents.view', 'incidents.edit', 'incidents.escalate', 'incidents.close',
                // Users - view own (handled in policy)
                'users.view',
                // HR - view employees, request time-off
                'hr.view_employees', 'hr.manage_workload',
                // Reports - view own metrics
                'reports.view',
            ];
            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $technicianRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Technician'],
            [
                'description' => 'Field technician - Operational access',
                'level' => 2,
                'is_system' => true,
                'metadata' => [
                    'color' => '#4CAF50',
                    'icon' => 'wrench',
                    'order' => 4,
                ],
            ]
        );
        $technicianRole->permissions()->sync($technicianPermissions->pluck('id'));
        $roles['technician'] = $technicianRole;
        $this->command->line('  ✓ Technician role created');

        // ========== ROLE: VIEWER (Level 1) ==========
        $viewerPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                'contracts.view',
                'assets.view',
                'incidents.view',
                'users.view',
                'hr.view_employees',
                'reports.view',
            ];
            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $viewerRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Viewer'],
            [
                'description' => 'Viewer - Read-only access',
                'level' => 1,
                'is_system' => true,
                'metadata' => [
                    'color' => '#9E9E9E',
                    'icon' => 'eye',
                    'order' => 5,
                ],
            ]
        );
        $viewerRole->permissions()->sync($viewerPermissions->pluck('id'));
        $roles['viewer'] = $viewerRole;
        $this->command->line('  ✓ Viewer role created');

        $this->command->info('✓ All 5 roles created successfully');

        // ========== ASSIGN ROLES TO TEST USERS ==========
        if ($superadminUser = User::where('email', 'admin@test.local')->first()) {
            $superadminUser->roles()->sync([$roles['superadmin']->id]);
            $this->command->line('  ✓ admin@test.local → Superadmin');
        }

        if ($managerUser = User::where('email', 'manager@test.local')->first()) {
            $managerUser->roles()->sync([$roles['manager']->id]);
            $this->command->line('  ✓ manager@test.local → Manager');
        }

        if ($techUser = User::where('email', 'tech@test.local')->first()) {
            $techUser->roles()->sync([$roles['technician']->id]);
            $this->command->line('  ✓ tech@test.local → Technician');
        }

        if ($viewerUser = User::where('email', 'viewer@test.local')->first()) {
            $viewerUser->roles()->sync([$roles['viewer']->id]);
            $this->command->line('  ✓ viewer@test.local → Viewer');
        }

        $this->command->info('✓ User roles assigned successfully');
        $this->command->info("\n✨ Role and Permission setup complete!");
    }
}

