<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantApiTest extends TestCase
{
    public function test_only_superadmin_can_access_tenant_management_list(): void
    {
        $admin = $this->createUserWithRole('Admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/tenants/manage');

        $response->assertStatus(403);
    }

    public function test_superadmin_can_create_and_update_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $create = $this->postJson('/api/tenants/manage', [
            'name' => 'Nordic Ops',
            'description' => 'Tenant for nordic operations',
            'status' => 'active',
        ]);

        $create->assertStatus(201)
            ->assertJsonPath('data.name', 'Nordic Ops')
            ->assertJsonMissingPath('data.slug')
            ->assertJsonMissingPath('data.domain');

        $tenantId = (int) $create->json('data.id');

        $update = $this->putJson('/api/tenants/manage/'.$tenantId, [
            'name' => 'Nordic Operations',
            'status' => 'suspended',
        ]);

        $update->assertStatus(200)
            ->assertJsonPath('data.name', 'Nordic Operations')
            ->assertJsonPath('data.status', 'suspended');
    }

    public function test_superadmin_can_soft_delete_and_restore_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $tenant = Tenant::create([
            'name' => 'Disposable Tenant',
            'status' => 'inactive',
        ]);

        $delete = $this->deleteJson('/api/tenants/manage/'.$tenant->id);
        $delete->assertStatus(200);

        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        $restore = $this->postJson('/api/tenants/manage/'.$tenant->id.'/restore');
        $restore->assertStatus(200)
            ->assertJsonPath('data.deleted_at', null);
    }

    public function test_tenant_hard_delete_is_disabled(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $tenant = Tenant::create([
            'name' => 'Archived Tenant',
            'status' => 'inactive',
        ]);
        $tenant->delete();

        $response = $this->deleteJson('/api/tenants/manage/'.$tenant->id.'/hard-delete');

        $response->assertStatus(403)
            ->assertJsonPath('success', false);

        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);
    }

    public function test_superadmin_can_delete_own_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $ownTenantId = (int) $superadmin->tenant_id;
        $response = $this->deleteJson('/api/tenants/manage/'.$ownTenantId);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.code', 'TENANT_HAS_USERS')
            ->assertJsonPath('data.users_count', 1);

        $this->assertDatabaseHas('tenants', [
            'id' => $ownTenantId,
            'deleted_at' => null,
        ]);
    }

    public function test_archive_returns_conflict_when_tenant_has_assigned_users(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $tenant = Tenant::create([
            'name' => 'Tenant With Users',
            'status' => 'active',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'status' => 'active',
        ]);

        $response = $this->deleteJson('/api/tenants/manage/'.$tenant->id);

        $response->assertStatus(409)
            ->assertJsonPath('data.code', 'TENANT_HAS_USERS')
            ->assertJsonPath('data.users_count', 1);

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'deleted_at' => null,
        ]);
    }

    public function test_superadmin_can_transfer_users_and_archive_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $sourceTenant = Tenant::create([
            'name' => 'Source Tenant',
            'status' => 'active',
        ]);
        $targetTenant = Tenant::create([
            'name' => 'Target Tenant',
            'status' => 'inactive',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $sourceTenant->id,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/tenants/manage/'.$sourceTenant->id.'/archive-with-transfer', [
            'target_tenant_id' => $targetTenant->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.moved_users_count', 1)
            ->assertJsonPath('data.source_tenant_id', $sourceTenant->id)
            ->assertJsonPath('data.target_tenant_id', $targetTenant->id);

        $this->assertSoftDeleted('tenants', ['id' => $sourceTenant->id]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'tenant_id' => $targetTenant->id,
        ]);
    }

    public function test_archive_with_transfer_rejects_archived_target_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $sourceTenant = Tenant::create([
            'name' => 'Archive Source',
            'status' => 'active',
        ]);
        $archivedTarget = Tenant::create([
            'name' => 'Archived Target',
            'status' => 'inactive',
        ]);
        $archivedTarget->delete();

        $response = $this->postJson('/api/tenants/manage/'.$sourceTenant->id.'/archive-with-transfer', [
            'target_tenant_id' => $archivedTarget->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('tenants', [
            'id' => $sourceTenant->id,
            'deleted_at' => null,
        ]);
    }

    public function test_archive_with_transfer_rejects_same_target_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $sourceTenant = Tenant::create([
            'name' => 'Same Target Source',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/tenants/manage/'.$sourceTenant->id.'/archive-with-transfer', [
            'target_tenant_id' => $sourceTenant->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['target_tenant_id']);
    }

    public function test_shared_tenant_list_returns_only_active_non_deleted_tenants(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        Tenant::create([
            'name' => 'Shared Active Tenant',
            'status' => 'active',
        ]);

        $inactive = Tenant::create([
            'name' => 'Shared Inactive Tenant',
            'status' => 'inactive',
        ]);

        $inactive->delete();

        $response = $this->getJson('/api/tenants');

        $response->assertStatus(200);

        $names = array_column($response->json('data'), 'name');
        $this->assertContains('Shared Active Tenant', $names);
        $this->assertNotContains('Shared Inactive Tenant', $names);
    }

    public function test_management_list_supports_pagination_filter_and_sort(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        Tenant::create([
            'name' => 'Alpha Tenant',
            'status' => 'active',
        ]);

        Tenant::create([
            'name' => 'Zulu Tenant',
            'status' => 'suspended',
        ]);

        Tenant::create([
            'name' => 'Bravo Tenant',
            'status' => 'suspended',
        ]);

        $response = $this->getJson('/api/tenants/manage?status=suspended&sort_by=name&sort_order=desc&per_page=1&page=1');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.per_page', 1)
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.total', 2)
            ->assertJsonPath('data.0.name', 'Zulu Tenant');
    }

    public function test_management_response_does_not_expose_slug_or_domain(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        Tenant::create([
            'name' => 'Visibility Tenant',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/tenants/manage?search=Visibility');

        $response->assertStatus(200)
            ->assertJsonMissingPath('data.0.slug')
            ->assertJsonMissingPath('data.0.domain');
    }

    public function test_archived_status_filter_returns_only_soft_deleted_tenants(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $archivedTenant = Tenant::create([
            'name' => 'Archived Tenant',
            'status' => 'inactive',
        ]);
        $archivedTenant->delete();

        Tenant::create([
            'name' => 'Visible Active Tenant',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/tenants/manage?status=archived');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.name', 'Archived Tenant');
    }

    private function createUserWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'tenant_id' => 1,
            'status' => 'active',
        ]);

        $role = Role::where('name', $roleName)
            ->firstOrFail();

        $user->roles()->sync([$role->id]);

        return $user;
    }
}
