<?php

namespace Tests\Feature\Api;

use App\Models\Contract;
use App\Models\Role;
use App\Models\User;
use Tests\TestCase;

class ContractApiTest extends TestCase
{
    protected User $admin;
    protected User $manager;
    protected User $technician;
    protected string $adminToken;
    protected string $managerToken;
    protected string $technicianToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users with roles
        $this->admin = User::factory()->create(['tenant_id' => 1, 'role' => 'admin']);
        $this->manager = User::factory()->create(['tenant_id' => 1, 'role' => 'manager']);
        $this->technician = User::factory()->create(['tenant_id' => 1, 'role' => 'technician']);

        // Assign roles
        $adminRole = Role::where('name', 'Admin')->first();
        $managerRole = Role::where('name', 'Manager')->first();
        $techRole = Role::where('name', 'Technician')->first();

        $this->admin->roles()->attach($adminRole);
        $this->manager->roles()->attach($managerRole);
        $this->technician->roles()->attach($techRole);

        // Create tokens
        $this->adminToken = $this->admin->createToken('test')->plainTextToken;
        $this->managerToken = $this->manager->createToken('test')->plainTextToken;
        $this->technicianToken = $this->technician->createToken('test')->plainTextToken;
    }

    /**
     * Test: Admin can list all contracts
     */
    public function test_admin_can_list_contracts(): void
    {
        Contract::factory(5)->create(['tenant_id' => 1]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/contracts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success', 'message', 'data', 'pagination'
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('pagination.total', 5);
    }

    /**
     * Test: List contracts with filters
     */
    public function test_can_filter_contracts_by_status(): void
    {
        Contract::factory(3)->create(['tenant_id' => 1, 'status' => 'draft']);
        Contract::factory(2)->create(['tenant_id' => 1, 'status' => 'in_progress']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/contracts?status=in_progress');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    /**
     * Test: Admin can create contract
     */
    public function test_admin_can_create_contract(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/contracts', [
                'contract_number' => 'CNT-TEST-001',
                'title' => 'Test Contract',
                'priority' => 'high',
                'description' => 'Test description',
                'budget' => 50000,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.contract_number', 'CNT-TEST-001')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('contracts', [
            'contract_number' => 'CNT-TEST-001',
        ]);
    }

    /**
     * Test: Technician cannot create contract
     */
    public function test_technician_cannot_create_contract(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->technicianToken}")
            ->postJson('/api/contracts', [
                'contract_number' => 'CNT-TEST-002',
                'title' => 'Test',
                'priority' => 'high',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Admin can view contract detail
     */
    public function test_admin_can_view_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $contract->id)
            ->assertJsonPath('data.contract_number', $contract->contract_number);
    }

    /**
     * Test: Admin can update contract
     */
    public function test_admin_can_update_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'title' => 'Old Title']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson("/api/contracts/{$contract->id}", [
                'title' => 'Updated Title',
                'priority' => 'critical',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Title')
            ->assertJsonPath('data.priority', 'critical');
    }

    /**
     * Test: Admin can delete contract
     */
    public function test_admin_can_delete_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('contracts', ['id' => $contract->id]);
    }

    /**
     * Test: Manager can approve contract
     */
    public function test_manager_can_approve_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'draft']);

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/contracts/{$contract->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');
    }

    /**
     * Test: Cannot approve non-draft contract
     */
    public function test_cannot_approve_non_draft_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/contracts/{$contract->id}/approve");

        $response->assertStatus(422);
    }

    /**
     * Test: Manager can change contract status
     */
    public function test_manager_can_change_contract_status(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/contracts/{$contract->id}/change-status", [
                'status' => 'in_progress',
                'reason' => 'Starting work',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');
    }

    /**
     * Test: Budget calculation is correct
     */
    public function test_budget_calculation(): void
    {
        $contract = Contract::factory()->create([
            'tenant_id' => 1,
            'budget' => 100000,
            'spent' => 35000,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.budget_usage_percent', 35)
            ->assertJsonPath('data.remaining_budget', 65000);
    }

    /**
     * Test: Unauthenticated user cannot access API
     */
    public function test_unauthenticated_user_cannot_access_api(): void
    {
        $response = $this->getJson('/api/contracts');

        $response->assertStatus(401);
    }

    /**
     * Test: Tenant isolation - cannot see other tenant's contracts
     */
    public function test_tenant_isolation(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);
        $otherTenantToken = $otherTenant->createToken('test')->plainTextToken;

        Contract::factory(3)->create(['tenant_id' => 1]);
        Contract::factory(2)->create(['tenant_id' => 999]);

        $response = $this->withHeader('Authorization', "Bearer {$otherTenantToken}")
            ->getJson('/api/contracts');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }
}

