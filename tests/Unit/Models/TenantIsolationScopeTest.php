<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class TenantIsolationScopeTest extends TestCase
{
    public function test_non_admin_user_sees_only_own_tenant_contracts(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $userA = User::factory()->create(['tenant_id' => $tenantA->id]);

        Contract::factory()->create(['tenant_id' => $tenantA->id]);
        Contract::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($userA);

        $visibleTenantIds = Contract::query()
            ->pluck('tenant_id')
            ->unique()
            ->values()
            ->all();

        $this->assertSame([$tenantA->id], $visibleTenantIds);
    }

    public function test_admin_user_can_bypass_tenant_scope_for_incidents(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $admin = User::factory()->create(['tenant_id' => $tenantA->id]);
        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        $admin->roles()->attach($adminRole->id);

        Incident::factory()->create(['tenant_id' => $tenantA->id]);
        Incident::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($admin);

        $this->assertSame(2, Incident::count());
    }

    public function test_tenant_id_is_auto_assigned_on_asset_create_for_non_admin_user(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $category = AssetCategory::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($user);

        $asset = Asset::factory()->create([
            'tenant_id' => null,
            'category_id' => $category->id,
        ]);

        $this->assertSame($tenant->id, $asset->tenant_id);
    }
}
