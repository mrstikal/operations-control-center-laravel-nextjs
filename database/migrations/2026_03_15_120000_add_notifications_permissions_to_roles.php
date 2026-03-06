<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Backfills missing notifications permissions and maps them to expected roles.
     */
    public function up(): void
    {
        $now = Carbon::now();

        DB::table('permissions')->updateOrInsert(
            ['resource' => 'notifications', 'action' => 'view'],
            [
                'name' => 'notifications.view',
                'description' => 'View notifications',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        DB::table('permissions')->updateOrInsert(
            ['resource' => 'notifications', 'action' => 'manage_schedules'],
            [
                'name' => 'notifications.manage_schedules',
                'description' => 'Manage notification schedules',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        $permissions = DB::table('permissions')
            ->where('resource', 'notifications')
            ->whereIn('action', ['view', 'manage_schedules'])
            ->get(['id', 'action'])
            ->keyBy('action');

        $roles = DB::table('roles')
            ->whereNull('deleted_at')
            ->whereIn('name', [
                'Superadmin',
                'Admin',
                'Manager',
                'Technician',
                'Viewer',
                'Viewer – Management',
                'Viewer – Auditor',
                'Viewer – Client',
            ])
            ->pluck('id', 'name');

        $canViewRoleNames = [
            'Superadmin',
            'Admin',
            'Manager',
            'Technician',
            'Viewer',
            'Viewer – Management',
            'Viewer – Auditor',
            'Viewer – Client',
        ];

        $canManageSchedulesRoleNames = [
            'Superadmin',
            'Admin',
        ];

        foreach ($canViewRoleNames as $roleName) {
            if (! isset($roles[$roleName], $permissions['view'])) {
                continue;
            }

            DB::table('role_permissions')->updateOrInsert(
                [
                    'role_id' => $roles[$roleName],
                    'permission_id' => $permissions['view']->id,
                ],
                [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }

        foreach ($canManageSchedulesRoleNames as $roleName) {
            if (! isset($roles[$roleName], $permissions['manage_schedules'])) {
                continue;
            }

            DB::table('role_permissions')->updateOrInsert(
                [
                    'role_id' => $roles[$roleName],
                    'permission_id' => $permissions['manage_schedules']->id,
                ],
                [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->where('resource', 'notifications')
            ->whereIn('action', ['view', 'manage_schedules'])
            ->pluck('id');

        if ($permissionIds->isEmpty()) {
            return;
        }

        DB::table('role_permissions')
            ->whereIn('permission_id', $permissionIds)
            ->delete();

        DB::table('permissions')
            ->whereIn('id', $permissionIds)
            ->delete();
    }
};
