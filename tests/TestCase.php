<?php

namespace Tests;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure deterministic default tenant for tests using tenant_id = 1
        Tenant::firstOrCreate(
            ['name' => 'Default Tenant'],
            [
                'status' => 'active',
            ]
        );

        // Some tests explicitly use tenant_id = 999 for isolation checks.
        if (! DB::table('tenants')->where('id', 999)->exists()) {
            DB::table('tenants')->insert([
                'id' => 999,
                'name' => 'External Tenant',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Ensure tenant 999 has at least Viewer role with contracts.view permission.
        $viewer999 = Role::firstOrCreate(
            ['name' => 'Viewer'],
            [
                'description' => 'Viewer role for tests',
                'level' => 1,
                'is_system' => true,
            ]
        );

        $contractsView999 = Permission::firstOrCreate(
            ['resource' => 'contracts', 'action' => 'view'],
            ['name' => 'contracts.view', 'description' => 'View contracts']
        );

        $viewer999->permissions()->syncWithoutDetaching([$contractsView999->id]);

        // Seed roles/permissions expected by API tests (Admin/Manager/Technician/...)
        $this->seed(RoleAndPermissionSeeder::class);
    }
}
