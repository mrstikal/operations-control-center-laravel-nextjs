<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
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
        // Create default tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default'],
            [
                'name' => 'Default Tenant',
                'domain' => 'localhost',
                'status' => 'active',
            ]
        );

        // Create roles
        $adminRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Admin'],
            [
                'description' => 'System Administrator',
                'level' => 'admin',
                'is_system' => true,
            ]
        );

        $managerRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Manager'],
            [
                'description' => 'Operations Manager',
                'level' => 'manager',
            ]
        );

        $technicianRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Technician'],
            [
                'description' => 'Field Technician',
                'level' => 'technician',
            ]
        );

        // Create permissions
        $resources = ['contracts', 'incidents', 'assets', 'employees', 'users'];
        $actions = ['view', 'create', 'edit', 'delete'];

        foreach ($resources as $resource) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'resource' => $resource,
                        'action' => $action,
                    ],
                    [
                        'name' => "{$resource}.{$action}",
                        'description' => ucfirst($action) . ' ' . $resource,
                    ]
                );
            }
        }

        // Assign all permissions to Admin role
        $adminPermissions = Permission::where('tenant_id', $tenant->id)->get();
        $adminRole->permissions()->sync($adminPermissions->pluck('id'));

        // Assign view permissions to Manager role
        $managerPermissions = Permission::where('tenant_id', $tenant->id)
            ->where('action', 'view')
            ->get();
        $managerRole->permissions()->sync($managerPermissions->pluck('id'));

        // Assign only view to Technician role
        $technicianPermissions = Permission::where('tenant_id', $tenant->id)
            ->where('action', 'view')
            ->where('resource', '!=', 'users')
            ->get();
        $technicianRole->permissions()->sync($technicianPermissions->pluck('id'));

        // Admin user for OCC
        $admin = User::firstOrCreate(
            ['email' => 'admin@test.local'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'tenant_id' => $tenant->id,
            ]
        );
        $admin->roles()->sync([$adminRole->id]);

        // Additional test users
        $users = User::factory(5)->create(['tenant_id' => $tenant->id]);
        foreach ($users as $user) {
            $user->roles()->sync([$managerRole->id]);
        }

        // Call other seeders
        $this->call([
            ContractSeeder::class,
            IncidentSeeder::class,
            AssetSeeder::class,
            EmployeeSeeder::class,
            DashboardEventSeeder::class,
        ]);
    }
}
