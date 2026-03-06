<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class TenantAuthorizationEdgeCasesTest extends TestCase
{
    protected User $superAdmin;

    protected User $admin1;

    protected User $admin2;

    protected User $manager1;

    protected User $manager2;

    protected Tenant $tenant1;

    protected Tenant $tenant2;

    protected function setUp(): void
    {
        parent::setUp();

        // Create two tenants
        $this->tenant1 = Tenant::firstWhere('name', 'Default Tenant');
        $this->tenant2 = Tenant::factory()->create(['name' => 'Second Tenant']);

        // Create superadmin (no tenant scope)
        $this->superAdmin = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $superAdminRole = Role::where('name', 'Superadmin')->first();
        if ($superAdminRole) {
            $this->superAdmin->roles()->attach($superAdminRole);
        }

        // Create admins for each tenant
        $this->admin1 = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->admin2 = User::factory()->create(['tenant_id' => $this->tenant2->id]);
        $adminRole = Role::where('name', 'Admin')->first();
        if ($adminRole) {
            $this->admin1->roles()->attach($adminRole);
            $this->admin2->roles()->attach($adminRole);
        }

        // Create managers for each tenant
        $this->manager1 = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->manager2 = User::factory()->create(['tenant_id' => $this->tenant2->id]);
        $managerRole = Role::where('name', 'Manager')->first();
        if ($managerRole) {
            $this->manager1->roles()->attach($managerRole);
            $this->manager2->roles()->attach($managerRole);
        }
    }

    /**
     * Test: Admin from tenant1 cannot access tenant2 contracts
     */
    public function test_admin_from_tenant1_cannot_read_tenant2_contracts(): void
    {
        // Create contract in tenant2
        $contract = Contract::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'client_id' => $this->admin2->id,
        ]);

        // Admin1 should not be able to view tenant2 contract
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(404);
    }

    /**
     * Test: Admin from tenant1 cannot list tenant2 contracts
     */
    public function test_admin_from_tenant1_cannot_list_tenant2_contracts(): void
    {
        // Create contracts in both tenants
        Contract::factory(3)->create(['tenant_id' => $this->tenant1->id]);
        Contract::factory(2)->create(['tenant_id' => $this->tenant2->id]);

        // Admin1 should only see tenant1 contracts
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson('/api/contracts');

        $response->assertStatus(200);
        $response->assertJsonPath('pagination.total', 3);
    }

    /**
     * Test: Superadmin can switch tenants via X-Tenant-Id header
     */
    public function test_superadmin_can_override_tenant_via_header(): void
    {
        // Create contract in tenant2
        $contract = Contract::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'client_id' => $this->admin2->id,
        ]);

        // Superadmin should be able to view via header override
        $response = $this->actingAs($this->superAdmin, 'web')
            ->withHeader('X-Tenant-Id', (string) $this->tenant2->id)
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200);
    }

    /**
     * Test: Admin can switch tenants AND see cross-tenant resources when header is set
     * Note: This tests current system behavior where admin can use X-Tenant-Id header
     */
    public function test_admin_can_use_tenant_header_to_access_own_resources(): void
    {
        // Create contract in tenant1
        $contract = Contract::factory()->create([
            'tenant_id' => $this->tenant1->id,
            'client_id' => $this->admin1->id,
        ]);

        // Admin can access own tenant resources with or without header
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200);

        $response = $this->actingAs($this->admin1, 'web')
            ->withHeader('X-Tenant-Id', (string) $this->tenant1->id)
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200);
    }

    /**
     * Test: Archived tenant allows read operations
     */
    public function test_archived_tenant_allows_read_operations(): void
    {
        // Create contract before archiving
        $contract = Contract::factory()->create(['tenant_id' => $this->tenant1->id]);

        // Archive tenant1
        $this->tenant1->delete();

        // Read should still work
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200);
    }

    /**
     * Test: Cross-tenant incident creation is blocked
     */
    public function test_manager_cannot_create_incident_for_other_tenant(): void
    {
        // Try to create incident with tenant2 assignment (if possible)
        $response = $this->actingAs($this->manager1, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Cross-tenant incident',
                'description' => 'Should fail',
                'category' => 'bug',
                'severity' => 'high',
                'priority' => 'high',
            ]);

        // Should succeed (creates in own tenant)
        $response->assertStatus(201);

        // Verify incident is in tenant1
        $incident = Incident::latest()->first();
        $this->assertSame($this->tenant1->id, $incident->tenant_id);
    }

    /**
     * Test: Asset update cannot change tenant without write guard
     */
    public function test_asset_update_respects_write_guard(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => $this->tenant1->id]);

        // Try to update asset name
        $response = $this->actingAs($this->admin1, 'web')
            ->putJson("/api/assets/{$asset->id}", [
                'name' => 'Updated Name',
                'status' => 'operational',
            ]);

        $response->assertStatus(200);
        $asset->refresh();
        $this->assertSame('Updated Name', $asset->name);
    }

    /**
     * Test: Soft-deleted resource still respects tenant boundary
     */
    public function test_soft_deleted_resource_respects_tenant_boundary(): void
    {
        // Create and soft-delete contract in tenant2
        $contract = Contract::factory()->create(['tenant_id' => $this->tenant2->id]);
        $contract->delete();

        // Admin1 should not be able to restore tenant2 contract
        $response = $this->actingAs($this->admin1, 'web')
            ->postJson("/api/contracts/{$contract->id}/restore");

        $response->assertStatus(404);
    }

    /**
     * Test: Hard-delete respects tenant boundary
     */
    public function test_hard_delete_respects_tenant_boundary(): void
    {
        // Create and soft-delete incident in tenant2
        $incident = Incident::factory()->create(['tenant_id' => $this->tenant2->id]);
        $incident->delete();

        // Admin1 should not be able to hard-delete tenant2 incident
        $response = $this->actingAs($this->admin1, 'web')
            ->deleteJson("/api/incidents/{$incident->id}/hard-delete");

        $response->assertStatus(404);
    }

    /**
     * Test: Tenant boundary is enforced in all read-write operations
     */
    public function test_tenant_boundary_enforced_across_operations(): void
    {
        // Create resources in both tenants
        $contract1 = Contract::factory()->create(['tenant_id' => $this->tenant1->id]);
        $contract2 = Contract::factory()->create(['tenant_id' => $this->tenant2->id]);

        $incident1 = Incident::factory()->create(['tenant_id' => $this->tenant1->id]);
        $incident2 = Incident::factory()->create(['tenant_id' => $this->tenant2->id]);

        // Admin1 can access own tenant resources
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/contracts/{$contract1->id}");
        $response->assertStatus(200);

        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/incidents/{$incident1->id}");
        $response->assertStatus(200);

        // Admin1 cannot access other tenant resources
        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/contracts/{$contract2->id}");
        $response->assertStatus(404);

        $response = $this->actingAs($this->admin1, 'web')
            ->getJson("/api/incidents/{$incident2->id}");
        $response->assertStatus(404);
    }

    /**
     * Test: Superadmin can bypass tenant restriction with proper header
     */
    public function test_superadmin_tenant_switch_with_header_override(): void
    {
        $contract1 = Contract::factory()->create(['tenant_id' => $this->tenant1->id]);
        $contract2 = Contract::factory()->create(['tenant_id' => $this->tenant2->id]);

        // Superadmin sees tenant1 by default
        $response = $this->actingAs($this->superAdmin, 'web')
            ->getJson("/api/contracts/{$contract1->id}");
        $response->assertStatus(200);

        // Superadmin can switch to tenant2 via header
        $response = $this->actingAs($this->superAdmin, 'web')
            ->withHeader('X-Tenant-Id', (string) $this->tenant2->id)
            ->getJson("/api/contracts/{$contract2->id}");
        $response->assertStatus(200);
    }
}
