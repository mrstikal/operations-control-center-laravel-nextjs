<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\MaintenanceSchedule;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class AssetApiTest extends TestCase
{
    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected User $viewer;

    protected AssetCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        // Create category
        $this->category = AssetCategory::factory()->create(['tenant_id' => 1]);

        // Create users
        $this->admin = User::factory()->create(['tenant_id' => 1]);
        $this->manager = User::factory()->create(['tenant_id' => 1]);
        $this->technician = User::factory()->create(['tenant_id' => 1]);
        $this->viewer = User::factory()->create(['tenant_id' => 1]);

        // Assign roles
        $this->admin->roles()->attach(Role::where('name', 'Admin')->first());
        $this->manager->roles()->attach(Role::where('name', 'Manager')->first());
        $this->technician->roles()->attach(Role::where('name', 'Technician')->first());
        $this->viewer->roles()->syncWithoutDetaching([Role::where('name', 'Viewer')->first()->id]);
    }

    /**
     * Test: Can list assets
     */
    public function test_can_list_assets(): void
    {
        Asset::factory(5)->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'message', 'data', 'pagination'])
            ->assertJsonPath('pagination.total', 5);
    }

    public function test_asset_list_includes_archived_tenant_name(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Archived Asset Tenant']);
        $asset = Asset::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $this->category->id,
        ]);

        $tenant->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/assets?all_tenants=true&per_page=100');

        $response->assertStatus(200);

        $assetPayload = collect($response->json('data'))
            ->firstWhere('id', $asset->id);

        $this->assertNotNull($assetPayload);
        $this->assertSame('Archived Asset Tenant', data_get($assetPayload, 'tenant.name'));
        $this->assertNotNull(data_get($assetPayload, 'tenant.deleted_at'));
    }

    /**
     * Test: Filter assets by status
     */
    public function test_can_filter_assets_by_status(): void
    {
        Asset::factory(3)->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'operational']);
        Asset::factory(2)->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'maintenance']);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/assets?status=maintenance');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    /**
     * Test: Admin can create asset
     */
    public function test_admin_can_create_asset(): void
    {
        $response = $this->actingAs($this->admin, 'web')
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

        $assetId = $response->json('data.id');

        $this->assertDatabaseHas('assets', [
            'asset_tag' => 'SRV-001',
        ]);

        $this->assertDatabaseHas('asset_audit_trail', [
            'asset_id' => $assetId,
            'user_id' => $this->admin->id,
            'action' => 'created',
        ]);
    }

    public function test_admin_cannot_create_asset_with_all_tenants_flag(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/assets?all_tenants=true', [
                'category_id' => $this->category->id,
                'name' => 'Blocked Asset',
                'asset_tag' => 'BLK-ASSET-001',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');

        $this->assertDatabaseMissing('assets', [
            'asset_tag' => 'BLK-ASSET-001',
        ]);
    }

    /**
     * Test: Technician cannot create asset
     */
    public function test_technician_cannot_create_asset(): void
    {
        $response = $this->actingAs($this->technician, 'web')
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

        $response = $this->actingAs($this->admin, 'web')
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

        $response = $this->actingAs($this->admin, 'web')
            ->putJson("/api/assets/{$asset->id}", [
                'status' => 'maintenance',
                'utilization_percent' => 85.5,
                'reason' => 'Planned maintenance window',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'maintenance')
            ->assertJsonPath('data.utilization_percent', 85.5);

        $this->assertDatabaseHas('asset_audit_trail', [
            'asset_id' => $asset->id,
            'user_id' => $this->admin->id,
            'action' => 'status_changed',
            'reason' => 'Planned maintenance window',
        ]);
    }

    public function test_admin_can_move_asset_to_selected_tenant(): void
    {
        $asset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
            'status' => 'operational',
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->putJson("/api/assets/{$asset->id}", [
                'tenant_id' => 999,
                'name' => 'Moved Asset',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Moved Asset');

        $this->assertDatabaseHas('assets', [
            'id' => $asset->id,
            'tenant_id' => 999,
            'name' => 'Moved Asset',
        ]);
    }

    /**
     * Test: Status change requires reason
     */
    public function test_status_change_requires_reason(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'status' => 'operational']);

        $response = $this->actingAs($this->admin, 'web')
            ->putJson("/api/assets/{$asset->id}", [
                'status' => 'maintenance',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.reason', ['The reason field is required.']);
    }

    /**
     * Test: Technician can log maintenance
     */
    public function test_technician_can_log_maintenance(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->actingAs($this->technician, 'web')
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

        $this->assertDatabaseHas('asset_audit_trail', [
            'asset_id' => $asset->id,
            'user_id' => $this->technician->id,
            'action' => 'maintenance_logged',
        ]);
    }

    /**
     * Test: Manager can schedule maintenance
     */
    public function test_manager_can_schedule_maintenance(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->actingAs($this->manager, 'web')
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

        $asset->refresh();
        $this->assertNotNull($asset->next_maintenance);
    }

    public function test_cannot_schedule_maintenance_with_past_next_due_date(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/assets/{$asset->id}/maintenance-schedules", [
                'frequency' => 'monthly',
                'description' => 'Invalid past schedule',
                'next_due_date' => now()->subDay()->toIso8601String(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['next_due_date']);
    }

    public function test_log_maintenance_recalculates_active_schedule_due_dates(): void
    {
        $asset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
            'next_maintenance' => now()->addDays(90),
        ]);

        $schedule = $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Monthly preventive',
            'next_due_date' => now()->addDays(5),
            'is_active' => true,
        ]);

        $performedAt = now()->subDay()->toIso8601String();

        $this->actingAs($this->technician, 'web')
            ->postJson("/api/assets/{$asset->id}/maintenance-logs", [
                'type' => 'preventive',
                'description' => 'Reset maintenance cycle',
                'performed_at' => $performedAt,
            ])
            ->assertStatus(200);

        $schedule->refresh();
        $expectedDueDate = \Illuminate\Support\Carbon::parse($performedAt)->addDays(30);
        $this->assertTrue($schedule->next_due_date->equalTo($expectedDueDate));

        $asset->refresh();
        $this->assertTrue($asset->next_maintenance->equalTo($schedule->next_due_date));
    }

    public function test_asset_next_maintenance_syncs_after_schedule_update_and_delete(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $first = $asset->maintenanceSchedules()->create([
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Near schedule',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $second = $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Later schedule',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        $this->actingAs($this->manager, 'web')
            ->patchJson("/api/assets/{$asset->id}/maintenance-schedules/{$first->id}", [
                'next_due_date' => now()->addDays(60)->toIso8601String(),
            ])
            ->assertStatus(200);

        $asset->refresh();
        $this->assertTrue($asset->next_maintenance->isSameDay($second->next_due_date));

        $this->actingAs($this->manager, 'web')
            ->deleteJson("/api/assets/{$asset->id}/maintenance-schedules/{$second->id}")
            ->assertStatus(200);

        $asset->refresh();
        $this->assertTrue($asset->next_maintenance->isSameDay($first->fresh()->next_due_date));
    }

    public function test_can_list_asset_maintenance_logs(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $asset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'preventive',
            'description' => 'Preventive check',
            'performed_at' => now()->subDays(1),
        ]);

        $asset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'repair',
            'description' => 'Repair pump',
            'performed_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/assets/{$asset->id}/maintenance-logs?type=preventive");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.type', 'preventive');
    }

    public function test_can_list_global_maintenance_logs_with_filters_and_tenant_scope(): void
    {
        $tenantOneAsset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $otherTenantCategory = AssetCategory::factory()->create(['tenant_id' => 999]);
        $tenantTwoAsset = Asset::factory()->create(['tenant_id' => 999, 'category_id' => $otherTenantCategory->id]);

        $tenantOneAsset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'preventive',
            'description' => 'In scope log',
            'performed_at' => now()->subDay(),
        ]);

        $tenantOneAsset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'repair',
            'description' => 'Different type',
            'performed_at' => now()->subDays(2),
        ]);

        $tenantTwoAsset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'preventive',
            'description' => 'Out of tenant scope',
            'performed_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/maintenance-logs?asset_id={$tenantOneAsset->id}&type=preventive");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.asset_id', $tenantOneAsset->id)
            ->assertJsonPath('data.0.type', 'preventive');
    }

    public function test_global_maintenance_logs_validation_returns_422_for_invalid_type(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/maintenance-logs?type=invalid');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_can_list_asset_maintenance_schedules_filtered_as_overdue(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Monthly maintenance',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
        ]);

        $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Future maintenance',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/assets/{$asset->id}/maintenance-schedules?overdue=1");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.is_overdue', true);
    }

    public function test_can_list_global_maintenance_schedules_with_filters_and_tenant_scope(): void
    {
        $tenantOneAsset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $otherTenantCategory = AssetCategory::factory()->create(['tenant_id' => 999]);
        $tenantTwoAsset = Asset::factory()->create(['tenant_id' => 999, 'category_id' => $otherTenantCategory->id]);

        MaintenanceSchedule::create([
            'asset_id' => $tenantOneAsset->id,
            'frequency' => 'monthly',
            'description' => 'In scope overdue schedule',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => MaintenanceSchedule::DUE_STATE_OVERDUE,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $tenantOneAsset->id,
            'frequency' => 'weekly',
            'description' => 'Not overdue',
            'next_due_date' => now()->addDays(2),
            'is_active' => true,
            'due_state' => MaintenanceSchedule::DUE_STATE_DUE_SOON,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $tenantTwoAsset->id,
            'frequency' => 'monthly',
            'description' => 'Out of tenant scope overdue',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => MaintenanceSchedule::DUE_STATE_OVERDUE,
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/maintenance-schedules?overdue=1&frequency=monthly');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.asset_id', $tenantOneAsset->id)
            ->assertJsonPath('data.0.due_state', MaintenanceSchedule::DUE_STATE_OVERDUE);
    }

    public function test_global_maintenance_schedules_validation_returns_422_for_invalid_due_state(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/maintenance-schedules?due_state=unknown');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['due_state']);
    }

    public function test_can_update_asset_maintenance_log(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $log = $asset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'preventive',
            'description' => 'Before update',
            'performed_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->patchJson("/api/assets/{$asset->id}/maintenance-logs/{$log->id}", [
                'description' => 'After update',
                'cost' => 199.99,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.maintenance_log.description', 'After update');

        $this->assertDatabaseHas('maintenance_logs', [
            'id' => $log->id,
            'description' => 'After update',
            'cost' => 199.99,
        ]);
    }

    public function test_can_delete_asset_maintenance_log(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $log = $asset->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'repair',
            'description' => 'To be deleted',
            'performed_at' => now(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->deleteJson("/api/assets/{$asset->id}/maintenance-logs/{$log->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('maintenance_logs', ['id' => $log->id]);
    }

    public function test_can_update_asset_maintenance_schedule(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $schedule = $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Monthly plan',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->patchJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}", [
                'interval_days' => 45,
                'description' => 'Updated plan',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.schedule.description', 'Updated plan');

        $this->assertDatabaseHas('maintenance_schedules', [
            'id' => $schedule->id,
            'interval_days' => 45,
            'description' => 'Updated plan',
        ]);
    }

    public function test_can_delete_asset_maintenance_schedule_soft_delete(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $schedule = $asset->maintenanceSchedules()->create([
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Weekly plan',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->deleteJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('maintenance_schedules', ['id' => $schedule->id]);
    }

    public function test_update_maintenance_log_returns_404_for_wrong_asset_parent(): void
    {
        $assetA = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $assetB = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $log = $assetA->maintenanceLogs()->create([
            'performed_by' => $this->technician->id,
            'type' => 'inspection',
            'description' => 'Scoped log',
            'performed_at' => now(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->patchJson("/api/assets/{$assetB->id}/maintenance-logs/{$log->id}", [
                'description' => 'Should fail',
            ]);

        $response->assertStatus(404);
    }

    public function test_technician_cannot_log_maintenance_for_asset_in_other_tenant(): void
    {
        $foreignAsset = Asset::factory()->create([
            'tenant_id' => 999,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson("/api/assets/{$foreignAsset->id}/maintenance-logs", [
                'type' => 'preventive',
                'description' => 'Cross-tenant attempt',
            ]);

        // Depending on middleware/policy order this can be 403 (forbidden) or 404 (scoped out).
        $this->assertTrue(
            in_array($response->status(), [403, 404], true),
            'Expected 403 or 404 for cross-tenant maintenance log write.'
        );

        $this->assertDatabaseMissing('maintenance_logs', [
            'asset_id' => $foreignAsset->id,
            'description' => 'Cross-tenant attempt',
        ]);
    }

    /**
     * Test: Filter assets due for maintenance
     */
    public function test_can_filter_assets_due_for_maintenance(): void
    {
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'next_maintenance' => now()->subDays(5)]);
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'next_maintenance' => now()->addDays(30)]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/assets?due_for_maintenance=true');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);
    }

    public function test_can_sort_assets_by_category_name(): void
    {
        $alphaCategory = AssetCategory::factory()->create([
            'tenant_id' => 1,
            'name' => 'AAA Category Sort',
        ]);
        $zetaCategory = AssetCategory::factory()->create([
            'tenant_id' => 1,
            'name' => 'ZZZ Category Sort',
        ]);

        Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $zetaCategory->id,
            'asset_tag' => 'SORT-CAT-Z',
            'name' => 'Zeta Asset',
        ]);
        Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $alphaCategory->id,
            'asset_tag' => 'SORT-CAT-A',
            'name' => 'Alpha Asset',
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/assets?sort=category:asc&per_page=100')
            ->assertStatus(200);

        $categories = collect($response->json('data'))
            ->pluck('category.name')
            ->values();

        $alphaIndex = $categories->search('AAA Category Sort');
        $zetaIndex = $categories->search('ZZZ Category Sort');

        $this->assertNotFalse($alphaIndex);
        $this->assertNotFalse($zetaIndex);
        $this->assertLessThan($zetaIndex, $alphaIndex);
    }

    /**
     * Test: Asset tag must be unique
     */
    public function test_asset_tag_must_be_unique(): void
    {
        Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id, 'asset_tag' => 'UNIQUE-001']);

        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/assets', [
                'category_id' => $this->category->id,
                'name' => 'Another Server',
                'asset_tag' => 'UNIQUE-001',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.asset_tag', ['The asset tag has already been taken.']);
    }

    /**
     * Test: Can get asset audit trail and filter it
     */
    public function test_can_get_asset_audit_trail_with_filters(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $asset->recordAudit('created', $this->admin->id, null, ['name' => $asset->name], 'Initial import');
        $asset->recordAudit('updated', $this->manager->id, ['location' => null], ['location' => 'HQ'], 'Location update');
        $asset->recordAudit('maintenance_logged', $this->technician->id, null, ['type' => 'preventive'], 'Maintenance done');

        $query = http_build_query([
            'action' => 'updated',
            'user_id' => $this->manager->id,
            'date_from' => now()->subDay()->toDateTimeString(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/assets/{$asset->id}/audit-trail?{$query}");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.action', 'updated')
            ->assertJsonPath('data.0.user_id', $this->manager->id);
    }

    public function test_can_restore_soft_deleted_asset(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/assets/{$asset->id}", ['reason' => 'Retiring old unit'])
            ->assertStatus(200);

        $this->assertSoftDeleted('assets', ['id' => $asset->id]);

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/assets/{$asset->id}/restore", ['reason' => 'Recovered from archive'])
            ->assertStatus(200)
            ->assertJsonPath('data.id', $asset->id);

        $this->assertDatabaseHas('assets', ['id' => $asset->id, 'deleted_at' => null]);
    }

    public function test_hard_delete_requires_soft_delete(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/assets/{$asset->id}/hard-delete", ['reason' => 'Permanent removal'])
            ->assertStatus(422);
    }

    public function test_can_retire_and_transfer_asset(): void
    {
        $asset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
            'status' => 'operational',
            'location' => 'Warehouse A',
        ]);

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/assets/{$asset->id}/retire", [
                'reason' => 'End of lifecycle',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'retired');

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/assets/{$asset->id}/transfer", [
                'location' => 'Warehouse B',
                'department' => 'Maintenance',
                'reason' => 'Moved to maintenance zone',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.location', 'Warehouse B')
            ->assertJsonPath('data.department', 'Maintenance');
    }

    public function test_reassign_rejects_user_from_other_tenant(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $foreignUser = User::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/assets/{$asset->id}/reassign", [
                'assigned_to' => $foreignUser->id,
                'reason' => 'Cross-tenant assignment should fail',
            ])
            ->assertStatus(422);
    }

    public function test_create_asset_rejects_category_from_other_tenant(): void
    {
        $foreignCategory = AssetCategory::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->postJson('/api/assets', [
                'category_id' => $foreignCategory->id,
                'name' => 'Cross Tenant Category Asset',
                'asset_tag' => 'CROSS-TENANT-CAT-001',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_update_asset_rejects_category_from_other_tenant(): void
    {
        $asset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
        ]);
        $foreignCategory = AssetCategory::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->putJson("/api/assets/{$asset->id}", [
                'category_id' => $foreignCategory->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);

        $asset->refresh();
        $this->assertSame($this->category->id, (int) $asset->category_id);
    }

    public function test_cross_tenant_user_cannot_show_asset_detail(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignAsset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
        ]);

        $this->actingAs($otherTenant, 'web')
            ->getJson("/api/assets/{$foreignAsset->id}")
            ->assertStatus(404);
    }

    public function test_cross_tenant_user_cannot_delete_asset(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignAsset = Asset::factory()->create([
            'tenant_id' => 1,
            'category_id' => $this->category->id,
        ]);

        $this->actingAs($otherTenant, 'web')
            ->deleteJson("/api/assets/{$foreignAsset->id}")
            ->assertStatus(404);
    }

    /**
     * Test: Technician can schedule maintenance
     */
    public function test_technician_can_schedule_maintenance(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson("/api/assets/{$asset->id}/maintenance-schedules", [
                'frequency' => 'monthly',
                'interval_days' => 30,
                'description' => 'Technician monthly schedule',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.schedule.asset_id', $asset->id)
            ->assertJsonPath('data.schedule.frequency', 'monthly');

        $this->assertDatabaseHas('maintenance_schedules', [
            'asset_id' => $asset->id,
            'description' => 'Technician monthly schedule',
        ]);
    }

    public function test_technician_can_update_and_delete_asset_maintenance_schedule(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $schedule = $asset->maintenanceSchedules()->create([
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Technician editable schedule',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $this->actingAs($this->technician, 'web')
            ->patchJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}", [
                'description' => 'Technician updated schedule',
                'interval_days' => 10,
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.schedule.description', 'Technician updated schedule');

        $this->assertDatabaseHas('maintenance_schedules', [
            'id' => $schedule->id,
            'description' => 'Technician updated schedule',
            'interval_days' => 10,
        ]);

        $this->actingAs($this->technician, 'web')
            ->deleteJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('maintenance_schedules', ['id' => $schedule->id]);
    }

    public function test_viewer_cannot_write_asset_maintenance_schedules(): void
    {
        $asset = Asset::factory()->create(['tenant_id' => 1, 'category_id' => $this->category->id]);
        $schedule = $asset->maintenanceSchedules()->create([
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Viewer denied schedule',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        $this->actingAs($this->viewer, 'web')
            ->postJson("/api/assets/{$asset->id}/maintenance-schedules", [
                'frequency' => 'monthly',
                'description' => 'Should not be created',
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Permission denied: assets.schedule_maintenance');

        $this->actingAs($this->viewer, 'web')
            ->patchJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}", [
                'description' => 'Should not update',
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Permission denied: assets.schedule_maintenance');

        $this->actingAs($this->viewer, 'web')
            ->deleteJson("/api/assets/{$asset->id}/maintenance-schedules/{$schedule->id}")
            ->assertStatus(403)
            ->assertJsonPath('message', 'Permission denied: assets.schedule_maintenance');
    }

    public function test_technician_cannot_write_schedule_for_asset_in_other_tenant(): void
    {
        $foreignAsset = Asset::factory()->create([
            'tenant_id' => 999,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson("/api/assets/{$foreignAsset->id}/maintenance-schedules", [
                'frequency' => 'monthly',
                'description' => 'Cross-tenant schedule attempt',
            ]);

        // Depending on middleware/policy order this can be 403 (forbidden) or 404 (scoped out).
        $this->assertTrue(
            in_array($response->status(), [403, 404], true),
            'Expected 403 or 404 for cross-tenant maintenance schedule write.'
        );

        $this->assertDatabaseMissing('maintenance_schedules', [
            'asset_id' => $foreignAsset->id,
            'description' => 'Cross-tenant schedule attempt',
        ]);
    }
}
