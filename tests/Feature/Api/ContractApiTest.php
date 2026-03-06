<?php

namespace Tests\Feature\Api;

use App\Models\Contract;
use App\Models\ContractIncident;
use App\Models\ContractStatusHistory;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class ContractApiTest extends TestCase
{
    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users with roles
        $this->admin = User::factory()->create(['tenant_id' => 1]);
        $this->manager = User::factory()->create(['tenant_id' => 1]);
        $this->technician = User::factory()->create(['tenant_id' => 1]);

        // Assign roles
        $adminRole = Role::where('name', 'Admin')->first();
        $managerRole = Role::where('name', 'Manager')->first();
        $techRole = Role::where('name', 'Technician')->first();

        $this->admin->roles()->attach($adminRole);
        $this->manager->roles()->attach($managerRole);
        $this->technician->roles()->attach($techRole);
    }

    /**
     * Test: Admin can list all contracts
     */
    public function test_admin_can_list_contracts(): void
    {
        Contract::factory(5)->create(['tenant_id' => 1]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success', 'message', 'data', 'pagination',
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('pagination.total', 5);
    }

    public function test_contract_list_includes_archived_tenant_name(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Archived Contract Tenant']);
        $contract = Contract::factory()->create(['tenant_id' => $tenant->id]);

        $tenant->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?all_tenants=true&per_page=100');

        $response->assertStatus(200);

        $contractPayload = collect($response->json('data'))
            ->firstWhere('id', $contract->id);

        $this->assertNotNull($contractPayload);
        $this->assertSame('Archived Contract Tenant', data_get($contractPayload, 'tenant.name'));
        $this->assertNotNull(data_get($contractPayload, 'tenant.deleted_at'));
    }

    public function test_contracts_list_includes_incidents_count(): void
    {
        $contractWithoutIncidents = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithOneIncident = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithTwoIncidents = Contract::factory()->create(['tenant_id' => 1]);

        ContractIncident::create([
            'contract_id' => $contractWithOneIncident->id,
            'title' => 'One incident',
            'description' => 'Incident for count = 1',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contractWithTwoIncidents->id,
            'title' => 'First incident',
            'description' => 'Incident for count = 2',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contractWithTwoIncidents->id,
            'title' => 'Second incident',
            'description' => 'Incident for count = 2',
            'severity' => 'low',
            'status' => 'in_review',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $contractsById = collect($response->json('data'))->keyBy('id');

        $this->assertArrayHasKey($contractWithoutIncidents->id, $contractsById->all());
        $this->assertArrayHasKey($contractWithOneIncident->id, $contractsById->all());
        $this->assertArrayHasKey($contractWithTwoIncidents->id, $contractsById->all());

        $this->assertSame(0, $contractsById[$contractWithoutIncidents->id]['incidents_count']);
        $this->assertSame(1, $contractsById[$contractWithOneIncident->id]['incidents_count']);
        $this->assertSame(2, $contractsById[$contractWithTwoIncidents->id]['incidents_count']);
    }

    public function test_can_filter_contracts_with_incidents_presence_with(): void
    {
        $contractWithoutIncidents = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithIncidents = Contract::factory()->create(['tenant_id' => 1]);

        ContractIncident::create([
            'contract_id' => $contractWithIncidents->id,
            'title' => 'Incident present',
            'description' => 'Used for incidents_presence=with filter',
            'severity' => 'critical',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?incidents_presence=with&per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($contractWithIncidents->id, $returnedIds);
        $this->assertNotContains($contractWithoutIncidents->id, $returnedIds);
    }

    public function test_can_filter_contracts_with_incidents_presence_without(): void
    {
        $contractWithoutIncidents = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithIncidents = Contract::factory()->create(['tenant_id' => 1]);

        ContractIncident::create([
            'contract_id' => $contractWithIncidents->id,
            'title' => 'Incident present',
            'description' => 'Used for incidents_presence=without filter',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?incidents_presence=without&per_page=100');

        $response->assertStatus(200);

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($contractWithoutIncidents->id, $returnedIds);
        $this->assertNotContains($contractWithIncidents->id, $returnedIds);
    }

    public function test_can_sort_contracts_by_incidents_count_desc(): void
    {
        $contractWithoutIncidents = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithOneIncident = Contract::factory()->create(['tenant_id' => 1]);
        $contractWithTwoIncidents = Contract::factory()->create(['tenant_id' => 1]);

        ContractIncident::create([
            'contract_id' => $contractWithOneIncident->id,
            'title' => 'One incident',
            'description' => 'Incident for sorting',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contractWithTwoIncidents->id,
            'title' => 'First incident',
            'description' => 'Incident for sorting',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contractWithTwoIncidents->id,
            'title' => 'Second incident',
            'description' => 'Incident for sorting',
            'severity' => 'low',
            'status' => 'open',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?sort=incidents_count:desc&per_page=100')
            ->assertStatus(200);

        $orderedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame($contractWithTwoIncidents->id, $orderedIds[0]);
        $this->assertSame($contractWithOneIncident->id, $orderedIds[1]);
        $this->assertSame($contractWithoutIncidents->id, $orderedIds[2]);
    }

    /**
     * Test: List contracts with filters
     */
    public function test_can_filter_contracts_by_status(): void
    {
        Contract::factory(3)->create(['tenant_id' => 1, 'status' => 'draft']);
        Contract::factory(2)->create(['tenant_id' => 1, 'status' => 'in_progress']);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?status=in_progress');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    /**
     * Test: Admin can create contract
     */
    public function test_admin_can_create_contract(): void
    {
        $response = $this->actingAs($this->admin, 'web')
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

    public function test_admin_can_create_contract_for_selected_tenant(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/contracts', [
                'tenant_id' => 999,
                'contract_number' => 'CNT-TEST-999',
                'title' => 'Cross-tenant Contract',
                'priority' => 'medium',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.contract_number', 'CNT-TEST-999');

        $this->assertDatabaseHas('contracts', [
            'contract_number' => 'CNT-TEST-999',
            'tenant_id' => 999,
        ]);
    }

    public function test_admin_cannot_create_contract_with_all_tenants_flag(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/contracts?all_tenants=true', [
                'contract_number' => 'CNT-ALL-TENANTS-001',
                'title' => 'Invalid write with all tenants',
                'priority' => 'high',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');

        $this->assertDatabaseMissing('contracts', [
            'contract_number' => 'CNT-ALL-TENANTS-001',
        ]);
    }

    /**
     * Test: Technician cannot create contract
     */
    public function test_technician_cannot_create_contract(): void
    {
        $response = $this->actingAs($this->technician, 'web')
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

        $response = $this->actingAs($this->admin, 'web')
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
        $contract = Contract::factory()->create([
            'tenant_id' => 1,
            'title' => 'Old Title',
            'contract_number' => 'CNT-EDIT-001',
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->putJson("/api/contracts/{$contract->id}", [
                'contract_number' => 'CNT-EDIT-001',
                'title' => 'Updated Title',
                'priority' => 'critical',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Title')
            ->assertJsonPath('data.priority', 'critical');

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'contract_number' => 'CNT-EDIT-001',
            'title' => 'Updated Title',
            'priority' => 'critical',
        ]);
    }

    public function test_manager_can_update_contract_number_and_status_from_edit_form(): void
    {
        $contract = Contract::factory()->create([
            'tenant_id' => 1,
            'contract_number' => 'CNT-OLD-100',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->putJson("/api/contracts/{$contract->id}", [
                'contract_number' => 'CNT-NEW-100',
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.contract_number', 'CNT-NEW-100')
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'contract_number' => 'CNT-NEW-100',
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('contract_status_history', [
            'contract_id' => $contract->id,
            'from_status' => 'approved',
            'to_status' => 'in_progress',
            'changed_by' => $this->manager->id,
            'reason' => 'Updated via contract edit',
        ]);
    }

    /**
     * Test: Admin can delete contract
     */
    public function test_admin_can_delete_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);

        $response = $this->actingAs($this->admin, 'web')
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

        $response = $this->actingAs($this->manager, 'web')
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

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/contracts/{$contract->id}/approve");

        $response->assertStatus(422);
    }

    /**
     * Test: Manager can change contract status
     */
    public function test_manager_can_change_contract_status(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'approved']);

        $response = $this->actingAs($this->manager, 'web')
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

        $response = $this->actingAs($this->admin, 'web')
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

        Contract::factory(3)->create(['tenant_id' => 1]);
        Contract::factory(2)->create(['tenant_id' => 999]);

        $response = $this->actingAs($otherTenant, 'web')
            ->getJson('/api/contracts');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    public function test_cross_tenant_user_cannot_show_contract_detail(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignContract = Contract::factory()->create(['tenant_id' => 1]);

        $this->actingAs($otherTenant, 'web')
            ->getJson("/api/contracts/{$foreignContract->id}")
            ->assertStatus(404);
    }

    public function test_cross_tenant_user_cannot_update_contract(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignContract = Contract::factory()->create(['tenant_id' => 1]);

        $this->actingAs($otherTenant, 'web')
            ->putJson("/api/contracts/{$foreignContract->id}", [
                'title' => 'Should not update',
            ])
            ->assertStatus(404);
    }

    /**
     * Test: Soft-deleted contract is hidden in default list
     */
    public function test_soft_deleted_contract_is_hidden_in_default_list(): void
    {
        $activeContract = Contract::factory()->create(['tenant_id' => 1]);
        $deletedContract = Contract::factory()->create(['tenant_id' => 1]);
        $deletedContract->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($activeContract->id, $returnedIds);
        $this->assertNotContains($deletedContract->id, $returnedIds);
    }

    /**
     * Test: Deleted contracts can be listed with status=deleted
     */
    public function test_can_list_only_deleted_contracts_with_status_deleted_filter(): void
    {
        $deletedContract = Contract::factory()->create(['tenant_id' => 1]);
        $activeContract = Contract::factory()->create(['tenant_id' => 1]);
        $deletedContract->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/contracts?status=deleted&per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($deletedContract->id, $returnedIds);
        $this->assertNotContains($activeContract->id, $returnedIds);
    }

    /**
     * Test: Show endpoint returns soft-deleted contract
     */
    public function test_can_show_soft_deleted_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);
        $contract->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $contract->id);

        $this->assertNotNull($response->json('data.deleted_at'));
    }

    /**
     * Test: Soft-deleted contract can be restored
     */
    public function test_can_restore_soft_deleted_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);
        $contract->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->postJson("/api/contracts/{$contract->id}/restore");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $contract->id);

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'deleted_at' => null,
        ]);
    }

    /**
     * Test: Hard delete requires prior soft delete
     */
    public function test_hard_delete_requires_soft_delete_first(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);

        $response = $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/contracts/hard-delete/{$contract->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('contracts', ['id' => $contract->id]);
    }

    /**
     * Test: Hard delete permanently removes soft-deleted contract
     */
    public function test_hard_delete_permanently_removes_soft_deleted_contract(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1]);
        $contract->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/contracts/hard-delete/{$contract->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('contracts', ['id' => $contract->id]);
    }

    /**
     * Test: Approve endpoint creates status history record
     */
    public function test_approve_creates_status_history_record(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'draft']);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/contracts/{$contract->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('contract_status_history', [
            'contract_id' => $contract->id,
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => $this->manager->id,
            'reason' => 'Approved via API',
        ]);
    }

    /**
     * Test: Change status endpoint creates history with reason
     */
    public function test_change_status_creates_status_history_with_reason(): void
    {
        $contract = Contract::factory()->create(['tenant_id' => 1, 'status' => 'approved']);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/contracts/{$contract->id}/change-status", [
                'status' => 'in_progress',
                'reason' => 'Work started by manager',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('contract_status_history', [
            'contract_id' => $contract->id,
            'from_status' => 'approved',
            'to_status' => 'in_progress',
            'changed_by' => $this->manager->id,
            'reason' => 'Work started by manager',
        ]);

        $this->assertEquals(
            1,
            ContractStatusHistory::where('contract_id', $contract->id)
                ->where('to_status', 'in_progress')
                ->count()
        );
    }

    public function test_create_contract_rejects_assigned_user_from_other_tenant(): void
    {
        $foreignUser = User::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->postJson('/api/contracts', [
                'contract_number' => 'CNT-CROSS-TENANT-001',
                'title' => 'Cross Tenant Assignment',
                'priority' => 'medium',
                'assigned_to' => $foreignUser->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_to']);
    }

    public function test_update_contract_rejects_cross_tenant_assigned_to_and_client(): void
    {
        $contract = Contract::factory()->create([
            'tenant_id' => 1,
            'assigned_to' => $this->manager->id,
            'client_id' => $this->admin->id,
        ]);
        $foreignAssigned = User::factory()->create(['tenant_id' => 999]);
        $foreignClient = User::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->putJson("/api/contracts/{$contract->id}", [
                'assigned_to' => $foreignAssigned->id,
                'client_id' => $foreignClient->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_to', 'client_id']);

        $contract->refresh();
        $this->assertSame($this->manager->id, (int) $contract->assigned_to);
        $this->assertSame($this->admin->id, (int) $contract->client_id);
    }
}
