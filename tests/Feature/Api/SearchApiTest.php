<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SearchApiTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['tenant_id' => 1]);
        $this->admin->roles()->attach(Role::where('name', 'Admin')->first());
    }

    public function test_search_returns_indexed_results_and_logs_query(): void
    {
        Contract::factory()->create([
            'tenant_id' => 1,
            'contract_number' => 'CTR-SRCH-001',
            'title' => 'Hydraulic pump failure',
            'description' => 'Urgent issue in production line',
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/search?q=Hydraulic');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.type', 'contract')
            ->assertJsonPath('data.0.title', 'Hydraulic pump failure');

        $this->assertDatabaseHas('search_queries', [
            'tenant_id' => 1,
            'user_id' => $this->admin->id,
            'query' => 'Hydraulic',
            'results_count' => 1,
        ]);
    }

    public function test_search_respects_tenant_scope_and_all_tenants_override(): void
    {
        Contract::factory()->create([
            'tenant_id' => 1,
            'contract_number' => 'CTR-TENANT-001',
            'title' => 'Cross Tenant Search Probe',
        ]);

        Contract::factory()->create([
            'tenant_id' => 999,
            'contract_number' => 'CTR-TENANT-999',
            'title' => 'Cross Tenant Search Probe',
        ]);

        $scopedResponse = $this->actingAs($this->admin, 'web')
            ->getJson('/api/search?q=Probe');

        $scopedResponse->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);

        $allTenantsResponse = $this->actingAs($this->admin, 'web')
            ->getJson('/api/search?q=Probe&all_tenants=true');

        $allTenantsResponse->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    public function test_search_filters_types_by_user_permissions(): void
    {
        $limitedUser = User::factory()->create(['tenant_id' => 1]);
        $limitedUser->roles()->detach();

        $role = Role::create([
            'name' => 'Search Limited Contracts',
            'description' => 'Only contracts.view for search tests',
            'level' => 1,
            'is_system' => false,
        ]);

        $contractsView = Permission::firstOrCreate(
            ['resource' => 'contracts', 'action' => 'view'],
            ['name' => 'contracts.view', 'description' => 'View contracts']
        );

        $role->permissions()->sync([$contractsView->id]);
        $limitedUser->roles()->attach($role);

        Contract::factory()->create([
            'tenant_id' => 1,
            'contract_number' => 'CTR-LIMIT-001',
            'title' => 'Shared search phrase',
        ]);

        Incident::factory()->create([
            'tenant_id' => 1,
            'title' => 'Shared search phrase',
            'reported_by' => $limitedUser->id,
        ]);

        $response = $this->actingAs($limitedUser, 'web')
            ->getJson('/api/search?q=Shared');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.type', 'contract');
    }

    public function test_search_reindex_command_backfills_index_records(): void
    {
        $category = AssetCategory::factory()->create(['tenant_id' => 1]);

        $asset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $category->id,
            'name' => 'Main compressor',
            'asset_tag' => 'AST-REINDEX-1',
        ]);

        DB::table('search_index')->delete();

        $this->artisan('search:reindex', ['--type' => 'asset', '--tenant_id' => 1])
            ->assertExitCode(0);

        $this->assertDatabaseHas('search_index', [
            'indexable_type' => 'asset',
            'indexable_id' => $asset->id,
            'tenant_id' => 1,
        ]);
    }
}
