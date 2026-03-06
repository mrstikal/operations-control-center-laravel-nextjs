<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Add the hr.manage_employees permission and assign it to Admin and Manager roles.
     *
     * Previously all employee CRUD routes incorrectly used hr.view_employees.
     * This migration introduces a dedicated write permission so that read-only
     * roles (Viewer, Technician) cannot create, update or delete employees.
     */
    public function up(): void
    {
        // Create the new permission (idempotent – skip if already exists).
        $permission = Permission::firstOrCreate(
            ['resource' => 'hr', 'action' => 'manage_employees'],
            [
                'name' => 'hr.manage_employees',
                'description' => 'Create, edit and delete employees',
            ]
        );

        // Assign to roles that should be able to manage employees.
        $rolesWithManageAccess = ['Superadmin', 'Admin', 'Manager'];

        Role::whereIn('name', $rolesWithManageAccess)->get()->each(function (Role $role) use ($permission): void {
            $role->permissions()->syncWithoutDetaching([$permission->id]);
        });
    }

    public function down(): void
    {
        $permission = Permission::where('resource', 'hr')
            ->where('action', 'manage_employees')
            ->first();

        if ($permission) {
            // Remove from all role_permissions before deleting.
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
