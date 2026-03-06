<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Add incidents.comment permission.
     *
     * The POST /incidents/{id}/comments endpoint was previously guarded by
     * incidents.view, which allowed read-only users to write comments.
     * This migration introduces a dedicated write permission for adding comments.
     *
     * Roles that receive this permission: Superadmin, Admin, Manager, Technician.
     * Viewer roles retain only incidents.view (read-only).
     */
    public function up(): void
    {
        $permission = Permission::firstOrCreate(
            ['resource' => 'incidents', 'action' => 'comment'],
            [
                'name' => 'incidents.comment',
                'description' => 'Add comments to incidents',
            ]
        );

        $rolesWithCommentAccess = ['Superadmin', 'Admin', 'Manager', 'Technician'];

        Role::whereIn('name', $rolesWithCommentAccess)->get()->each(function (Role $role) use ($permission): void {
            $role->permissions()->syncWithoutDetaching([$permission->id]);
        });
    }

    public function down(): void
    {
        $permission = Permission::where('resource', 'incidents')
            ->where('action', 'comment')
            ->first();

        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
