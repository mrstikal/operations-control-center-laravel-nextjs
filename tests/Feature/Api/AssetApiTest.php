<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Role;
use App\Models\User;
use Tests\TestCase;

class AssetApiTest extends TestCase
{
    protected User $admin;
    protected User $manager;
    protected User $technician;
    protected AssetCategory $category;
    protected string $adminToken;
    protected string $managerToken;
    protected string $technicianToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Create category
        $this->category = AssetCategory::factory()->create(['tenant_id' => 1]);

        // Create users
        $this->admin = User::factory()->create(['tenant_id' => 1, 'role' => 'admin']);
        $this->manager = User::factory()->create(['tenant_id' => 1, 'role' => 'manager']);
        $this->technician = User::factory()->create(['tenant_id' => 1, 'role' => 'technician']);

        // Assign roles
        $this->admin->roles()->attach(Role::where('name', 'Admin')->first());
        $this->manager->roles()->attach(Role::where('name', 'Manager')->first());
        $this->technician->roles()->attach(Role::where('name', 'Technician')->first());

        // Create tokens
        $this->adminToken = $this->admin->createToken('test')->plainTextToken;
        $this->managerToken = $this->manager->createToken('test')->plainTextToken;
        $this->technicianToken = $this->technician->createToken('test')->plainTextToken;
    }

    /**
     * Test: Can list assets
     */
    public function test_can_list_assets(): void
    {
        Asset::factory(5)->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'message', 'data', 'pagination'])
            ->assertJsonPath('pagination.total', 5);
    }

    /**
     * Test: Filter assets by status
     */
    public function test_can_filter_assets_by_status(): void
    {
        Asset::factory(3)->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'operational']);
        Asset::factory(2)->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'maintenance']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/assets?status=maintenance');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    /**
     * Test: Admin can create asset
     */
    public function test_admin_can_create_asset(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/assets', [
                'category_id' => $this->category->id,
                'name' => 'Server Dell',
                'asset_tag' => 'SRV-001',
                'serial_number' => 'ABC123XYZ',
                'location' => 'Data Center',
                'manufacturer' => 'Dell',
                'model' => 'PowerEdge R750',
                'maintenance_interval_days' => 90,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.asset_tag', 'SRV-001')
            ->assertJsonPath('data.status', 'operational');

        $this->assertDatabaseHas('assets', [
            'asset_tag' => 'SRV-001',
        ]);
    }

    /**
     * Test: Technician cannot create asset
     */
    public function test_technician_cannot_create_asset(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->technicianToken}")
            ->postJson('/api/assets', [
                'category_id' => $this->category->id,
                'name' => 'Server',
                'asset_tag' => 'SRV-002',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Can view asset detail
     */
    public function test_can_view_asset(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/api/assets/{$asset->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $asset->id)
            ->assertJsonPath('data.asset_tag', $asset->asset_tag);
    }

    /**
     * Test: Admin can update asset
     */
    public function test_admin_can_update_asset(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'operational']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson("/api/assets/{$asset->id}", [
                'status' => 'maintenance',
                'utilization_percent' => 85.5,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'maintenance')
            ->assertJsonPath('data.utilization_percent', 85.5);
    }

    /**
     * Test: Technician can log maintenance
     */
    public function test_technician_can_log_maintenance(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->technicianToken}")
            ->postJson("/api/assets/{$asset->id}/log-maintenance", [
                'type' => 'preventive',
                'description' => 'Oil change and filter replacement',
                'hours_spent' => 2.5,
                'cost' => 150,
                'notes' => 'Regular maintenance performed',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['asset', 'maintenance_log']]);

        $this->assertDatabaseHas('maintenance_logs', [
            'asset_id' => $asset->id,
            'type' => 'preventive',
        ]);
    }

    /**
     * Test: Manager can schedule maintenance
     */
    public function test_manager_can_schedule_maintenance(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/assets/{$asset->id}/schedule-maintenance", [
                'frequency' => 'quarterly',
                'interval_days' => 90,
                'description' => 'Quarterly preventive maintenance',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['schedule']]);

        $this->assertDatabaseHas('maintenance_schedules', [
            'asset_id' => $asset->id,
            'frequency' => 'quarterly',
        ]);
    }

    /**
     * Test: Filter assets due for maintenance
     */
    public function test_can_filter_assets_due_for_maintenance(): void
    {
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'next_maintenance' => now()->subDays(5)]);
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'next_maintenance' => now()->addDays(30)]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/assets?due_for_maintenance=true');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);
    }

    /**
     * Test: Asset tag must be unique
     */
    public function test_asset_tag_must_be_unique(): void
    {
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'asset_tag' => 'UNIQUE-001']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/assets', [
                'category_id' => $this->category->id,
                'name' => 'Another Server',
                'asset_tag' => 'UNIQUE-001',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.asset_tag', ['The asset tag has already been taken.']);
    }
}

