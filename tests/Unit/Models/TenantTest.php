<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TenantTest extends TestCase
{
    /**
     * Test: Tenant has many users
     */
    public function test_tenant_has_many_users(): void
    {
        $tenant = Tenant::factory()->create();
        User::factory(3)->create(['tenant_id' => $tenant->id]);

        $this->assertInstanceOf(HasMany::class, $tenant->users());
        $this->assertCount(3, $tenant->users);
    }

    /**
     * Test: Tenant has many contracts
     */
    public function test_tenant_has_many_contracts(): void
    {
        $tenant = Tenant::factory()->create();
        Contract::factory(2)->create(['tenant_id' => $tenant->id]);

        $this->assertInstanceOf(HasMany::class, $tenant->contracts());
        $this->assertCount(2, $tenant->contracts);
    }

    /**
     * Test: Tenant has many assets
     */
    public function test_tenant_has_many_assets(): void
    {
        $tenant = Tenant::factory()->create();
        Asset::factory(4)->create(['tenant_id' => $tenant->id]);

        $this->assertInstanceOf(HasMany::class, $tenant->assets());
        $this->assertCount(4, $tenant->assets);
    }

    /**
     * Test: Tenant has many incidents
     */
    public function test_tenant_has_many_incidents(): void
    {
        $tenant = Tenant::factory()->create();
        Incident::factory(5)->create(['tenant_id' => $tenant->id]);

        $this->assertInstanceOf(HasMany::class, $tenant->incidents());
        $this->assertCount(5, $tenant->incidents);
    }

    /**
     * Test: Scope active filters active tenants
     */
    public function test_scope_active_filters_active_tenants(): void
    {
        $active1 = Tenant::factory()->create(['status' => 'active']);
        $active2 = Tenant::factory()->create(['status' => 'active']);
        $suspended = Tenant::factory()->create(['status' => 'suspended']);

        $activeTenants = Tenant::active()->whereIn('id', [$active1->id, $active2->id, $suspended->id])->get();

        $this->assertCount(2, $activeTenants);
    }

    /**
     * Test: Can activate tenant
     */
    public function test_can_activate_tenant(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'inactive']);

        $tenant->activate();

        $this->assertEquals('active', $tenant->fresh()->status);
        $this->assertNotNull($tenant->fresh()->activated_at);
        $this->assertInstanceOf(Carbon::class, $tenant->fresh()->activated_at);
    }

    /**
     * Test: Can suspend tenant
     */
    public function test_can_suspend_tenant(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);

        $tenant->suspend();

        $this->assertEquals('suspended', $tenant->fresh()->status);
        $this->assertNotNull($tenant->fresh()->suspended_at);
        $this->assertInstanceOf(Carbon::class, $tenant->fresh()->suspended_at);
    }

    /**
     * Test: Can check if tenant is active
     */
    public function test_can_check_if_tenant_is_active(): void
    {
        $activeTenant = Tenant::factory()->create(['status' => 'active']);
        $suspendedTenant = Tenant::factory()->create(['status' => 'suspended']);

        $this->assertTrue($activeTenant->isActive());
        $this->assertFalse($suspendedTenant->isActive());
    }

    /**
     * Test: Metadata field is cast to json
     */
    public function test_metadata_field_is_cast_to_json(): void
    {
        $tenant = Tenant::factory()->create([
            'metadata' => ['plan' => 'enterprise', 'max_users' => 100],
        ]);

        $this->assertIsArray($tenant->metadata);
        $this->assertSame(['plan' => 'enterprise', 'max_users' => 100], $tenant->metadata);
    }

    /**
     * Test: Datetime fields are cast to Carbon
     */
    public function test_datetime_fields_are_cast_to_carbon(): void
    {
        $tenant = Tenant::factory()->create([
            'activated_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $tenant->activated_at);
    }
}
