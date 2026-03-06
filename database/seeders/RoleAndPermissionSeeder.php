<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 5 roles with granular permissions
     */
    public function run(): void
    {
        $roles = [];

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

            // Incidents (7)
            ['resource' => 'incidents', 'action' => 'view', 'description' => 'View incidents'],
            ['resource' => 'incidents', 'action' => 'create', 'description' => 'Create incidents'],
            ['resource' => 'incidents', 'action' => 'edit', 'description' => 'Edit incidents'],
            ['resource' => 'incidents', 'action' => 'delete', 'description' => 'Delete incidents'],
            ['resource' => 'incidents', 'action' => 'escalate', 'description' => 'Escalate incidents'],
            ['resource' => 'incidents', 'action' => 'close', 'description' => 'Close incidents'],
            ['resource' => 'incidents', 'action' => 'comment', 'description' => 'Add comments to incidents'],

            // Users/HR (5)
            ['resource' => 'users', 'action' => 'view', 'description' => 'View users'],
            ['resource' => 'users', 'action' => 'create', 'description' => 'Create users'],
            ['resource' => 'users', 'action' => 'edit', 'description' => 'Edit users'],
            ['resource' => 'users', 'action' => 'delete', 'description' => 'Delete users'],
            ['resource' => 'users', 'action' => 'assign_role', 'description' => 'Assign roles to users'],

            // HR Operations (5)
            ['resource' => 'hr', 'action' => 'view_employees', 'description' => 'View employees'],
            ['resource' => 'hr', 'action' => 'manage_employees', 'description' => 'Create, edit and delete employees'],
            ['resource' => 'hr', 'action' => 'manage_shifts', 'description' => 'Manage shifts'],
            ['resource' => 'hr', 'action' => 'approve_timeoff', 'description' => 'Approve time-off requests'],
            ['resource' => 'hr', 'action' => 'manage_workload', 'description' => 'Manage workload'],

            // Reports (3)
            ['resource' => 'reports', 'action' => 'view', 'description' => 'View reports'],
            ['resource' => 'reports', 'action' => 'export', 'description' => 'Export reports'],
            ['resource' => 'reports', 'action' => 'create', 'description' => 'Create custom reports'],

            // Notifications (2)
            ['resource' => 'notifications', 'action' => 'view', 'description' => 'View notifications'],
            ['resource' => 'notifications', 'action' => 'manage_schedules', 'description' => 'Manage notification schedules'],

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
                    'resource' => $data['resource'],
                    'action' => $data['action'],
                ],
                [
                    'name' => "{$data['resource']}.{$data['action']}",
                    'description' => $data['description'],
                ]
            );
            $permissions[] = $permission;
        }

        $this->command->info('✓ '.count($permissions).' Permissions created successfully');

        // ========== ROLE: SUPERADMIN (Level 5) ==========
        $superadminRole = Role::firstOrCreate(
            ['name' => 'Superadmin'],
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
        // Admin má VEŠKERÉ permisiony KROMĚ system management (per ROLES_DESIGN.md)
        $adminPermissions = collect($permissions)->filter(function ($p) {
            // Admin NEMÁ žádný přístup k system resource
            return $p->resource !== 'system';
        });
        $adminRole = Role::firstOrCreate(
            ['name' => 'Admin'],
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
                // Incidents - view, create, edit, escalate, close, comment
                'incidents.view', 'incidents.create', 'incidents.edit', 'incidents.escalate', 'incidents.close', 'incidents.comment',
                // Users - view, create, edit
                'users.view', 'users.create', 'users.edit',
                // HR - full
                'hr.view_employees', 'hr.manage_employees', 'hr.manage_shifts', 'hr.approve_timeoff', 'hr.manage_workload',
                // Reports - view, export, create
                'reports.view', 'reports.export', 'reports.create',
                // Notifications - read access
                'notifications.view',
                // Settings - view only
                'settings.view',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $managerRole = Role::firstOrCreate(
            ['name' => 'Manager'],
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
                // Assets - view + full maintenance actions
                'assets.view', 'assets.log_maintenance', 'assets.schedule_maintenance',
                // Incidents - view, create, edit, escalate, close, comment
                'incidents.view', 'incidents.create', 'incidents.edit', 'incidents.escalate', 'incidents.close', 'incidents.comment',
                // Users - view own (handled in policy)
                'users.view',
                // HR - view employees, request time-off
                'hr.view_employees', 'hr.manage_workload',
                // Reports - view own metrics
                'reports.view',
                // Notifications - read access
                'notifications.view',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $technicianRole = Role::firstOrCreate(
            ['name' => 'Technician'],
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

        // ========== ROLE: VIEWER (Legacy, Level 1) ==========
        $viewerPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                'contracts.view', 'assets.view', 'incidents.view',
                'users.view', 'reports.view', 'notifications.view',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed, true);
        });
        $viewerRole = Role::firstOrCreate(
            ['name' => 'Viewer'],
            [
                'description' => 'Legacy viewer role - basic read-only',
                'level' => 1,
                'is_system' => true,
                'metadata' => [
                    'color' => '#16a34a',
                    'icon' => 'eye',
                    'order' => 5,
                ],
            ]
        );
        $viewerRole->permissions()->sync($viewerPermissions->pluck('id'));
        $roles['viewer'] = $viewerRole;
        $this->command->line('  ✓ Viewer role created');

        // ========== ROLE: VIEWER – Management (Level 13) ==========
        $viewerMgmtPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                // Full view access for strategic overview
                'contracts.view', 'assets.view', 'incidents.view', 'users.view',
                'hr.view_employees', 'reports.view', 'reports.export', 'notifications.view',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $viewerMgmtRole = Role::firstOrCreate(
            ['name' => 'Viewer – Management'],
            [
                'description' => 'Management viewer - Tenant-wide read-only for strategy',
                'level' => 13,
                'is_system' => true,
                'metadata' => [
                    'color' => '#1976D2',
                    'icon' => 'eye-strategic',
                    'order' => 6,
                    'subtype' => 'management',
                ],
            ]
        );
        $viewerMgmtRole->permissions()->sync($viewerMgmtPermissions->pluck('id'));
        $roles['viewer_management'] = $viewerMgmtRole;
        $this->command->line('  ✓ Viewer – Management role created');

        // ========== ROLE: VIEWER – Auditor (Level 12) ==========
        $viewerAuditPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                // Limited to assigned items only
                'contracts.view', 'assets.view', 'incidents.view',
                'reports.view', 'reports.export', 'notifications.view',
                // Plus audit-specific permissions
                'system.view_audit_logs',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $viewerAuditRole = Role::firstOrCreate(
            ['name' => 'Viewer – Auditor'],
            [
                'description' => 'Auditor viewer - Limited to assigned items for compliance',
                'level' => 12,
                'is_system' => true,
                'metadata' => [
                    'color' => '#F57C00',
                    'icon' => 'eye-check',
                    'order' => 7,
                    'subtype' => 'auditor',
                ],
            ]
        );
        $viewerAuditRole->permissions()->sync($viewerAuditPermissions->pluck('id'));
        $roles['viewer_auditor'] = $viewerAuditRole;
        $this->command->line('  ✓ Viewer – Auditor role created');

        // ========== ROLE: VIEWER – Client (Level 11) ==========
        $viewerClientPermissions = collect($permissions)->filter(function ($p) {
            $allowed = [
                // ONLY assigned/own resources
                'contracts.view',  // Own contracts only
                'incidents.view',  // Own incidents only
                'reports.view',    // Own reports only
                'notifications.view',
            ];

            return in_array("{$p->resource}.{$p->action}", $allowed);
        });
        $viewerClientRole = Role::firstOrCreate(
            ['name' => 'Viewer – Client'],
            [
                'description' => 'Client viewer - Own projects and incidents only',
                'level' => 11,
                'is_system' => true,
                'metadata' => [
                    'color' => '#4CAF50',
                    'icon' => 'eye-user',
                    'order' => 8,
                    'subtype' => 'client',
                    'external' => true,
                ],
            ]
        );
        $viewerClientRole->permissions()->sync($viewerClientPermissions->pluck('id'));
        $roles['viewer_client'] = $viewerClientRole;
        $this->command->line('  ✓ Viewer – Client role created');

        $this->command->info('✓ All 8 roles created successfully (5 system + 3 viewer subtypes)');

        // ========== ASSIGN ROLES TO TEST USERS ==========
        if ($superadminUser = User::where('email', 'superadmin@test.local')->first()) {
            $superadminUser->roles()->sync([$roles['superadmin']->id]);
            $this->command->line('  ✓ superadmin@test.local → Superadmin');
        }

        if ($adminUser = User::where('email', 'admin@test.local')->first()) {
            $adminUser->roles()->sync([$roles['admin']->id]);
            $this->command->line('  ✓ admin@test.local → Admin');
        }

        if ($managerUser = User::where('email', 'manager@test.local')->first()) {
            $managerUser->roles()->sync([$roles['manager']->id]);
            $this->command->line('  ✓ manager@test.local → Manager');
        }

        if ($techUser = User::where('email', 'tech@test.local')->first()) {
            $techUser->roles()->sync([$roles['technician']->id]);
            $this->command->line('  ✓ tech@test.local → Technician');
        }

        // Assign viewer subtypes to test users
        if ($viewerMgmtUser = User::where('email', 'viewer-management@test.local')->first()) {
            $viewerMgmtUser->roles()->sync([$roles['viewer_management']->id]);
            $this->command->line('  ✓ viewer-management@test.local → Viewer – Management');
        }

        if ($viewerAuditUser = User::where('email', 'viewer-auditor@test.local')->first()) {
            $viewerAuditUser->roles()->sync([$roles['viewer_auditor']->id]);
            $this->command->line('  ✓ viewer-auditor@test.local → Viewer – Auditor');
        }

        if ($viewerClientUser = User::where('email', 'viewer-client@test.local')->first()) {
            $viewerClientUser->roles()->sync([$roles['viewer_client']->id]);
            $this->command->line('  ✓ viewer-client@test.local → Viewer – Client');
        }

        // Legacy: assign old "viewer@test.local" to Management viewer (most common)
        if ($viewerUser = User::where('email', 'viewer@test.local')->first()) {
            $viewerUser->roles()->sync([$roles['viewer']->id]);
            $this->command->line('  ✓ viewer@test.local → Viewer (legacy)');
        }

        $this->command->info('✓ User roles assigned successfully');
        $this->command->info("\n✨ Role and Permission setup complete!");
    }
}
