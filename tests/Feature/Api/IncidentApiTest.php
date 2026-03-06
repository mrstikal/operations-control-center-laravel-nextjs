<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class IncidentApiTest extends TestCase
{
    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->admin = User::factory()->create(['tenant_id' => 1]);
        $this->manager = User::factory()->create(['tenant_id' => 1]);
        $this->technician = User::factory()->create(['tenant_id' => 1]);

        // Assign roles
        $this->admin->roles()->attach(Role::where('name', 'Admin')->first());
        $this->manager->roles()->attach(Role::where('name', 'Manager')->first());
        $this->technician->roles()->attach(Role::where('name', 'Technician')->first());
    }

    /**
     * Test: Can list incidents
     */
    public function test_can_list_incidents(): void
    {
        Incident::factory(5)->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'message', 'data', 'pagination'])
            ->assertJsonPath('pagination.total', 5);
    }

    public function test_incident_list_includes_archived_tenant_name(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Archived Tenant']);
        $incident = Incident::factory()->create([
            'tenant_id' => $tenant->id,
            'reported_by' => $this->admin->id,
        ]);

        $tenant->delete();

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents?all_tenants=true&per_page=100');

        $response->assertStatus(200);

        $incidentPayload = collect($response->json('data'))
            ->firstWhere('id', $incident->id);

        $this->assertNotNull($incidentPayload);
        $this->assertSame('Archived Tenant', data_get($incidentPayload, 'tenant.name'));
        $this->assertNotNull(data_get($incidentPayload, 'tenant.deleted_at'));
    }

    /**
     * Test: Filter incidents by severity
     */
    public function test_can_filter_incidents_by_severity(): void
    {
        Incident::factory(3)->create(['tenant_id' => 1, 'severity' => 'critical', 'reported_by' => $this->admin->id]);
        Incident::factory(2)->create(['tenant_id' => 1, 'severity' => 'low', 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents?severity=critical');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 3);
    }

    /**
     * Test: Can create incident
     */
    public function test_can_create_incident(): void
    {
        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Server Down',
                'description' => 'Production server is down',
                'category' => 'infrastructure',
                'severity' => 'critical',
                'priority' => 'critical',
                'sla_response_minutes' => 15,
                'sla_resolution_minutes' => 120,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Server Down')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.reported_by.id', $this->technician->id);

        $incidentId = (int) $response->json('data.id');

        $this->assertDatabaseHas('incidents', [
            'id' => $incidentId,
            'title' => 'Server Down',
        ]);

        $this->assertDatabaseHas('incident_timeline', [
            'incident_id' => $incidentId,
            'event_type' => 'created',
            'user_id' => $this->technician->id,
        ]);
    }

    public function test_admin_can_create_incident_for_selected_tenant(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/incidents', [
                'tenant_id' => 999,
                'title' => 'Tenant Scoped Incident',
                'description' => 'Created under selected tenant context',
                'category' => 'infrastructure',
                'severity' => 'high',
                'priority' => 'high',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Tenant Scoped Incident');

        $this->assertDatabaseHas('incidents', [
            'title' => 'Tenant Scoped Incident',
            'tenant_id' => 999,
        ]);
    }

    public function test_admin_cannot_create_incident_with_all_tenants_flag(): void
    {
        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/incidents?all_tenants=true', [
                'title' => 'Blocked All Tenants Incident',
                'description' => 'Write should be denied when all_tenants is enabled',
                'category' => 'infrastructure',
                'severity' => 'high',
                'priority' => 'high',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');

        $this->assertDatabaseMissing('incidents', [
            'title' => 'Blocked All Tenants Incident',
        ]);
    }

    /**
     * Test: Can view incident detail
     */
    public function test_can_view_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson("/api/incidents/{$incident->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $incident->id)
            ->assertJsonPath('data.title', $incident->title);
    }

    /**
     * Test: Can escalate incident
     */
    public function test_can_escalate_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/incidents/{$incident->id}/escalate", [
                'escalated_to' => $this->manager->id,
                'escalation_level' => 'level_2',
                'reason' => 'Needs senior review',
                'notes' => 'Complex issue',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'escalated');

        $this->assertDatabaseHas('incident_escalations', [
            'incident_id' => $incident->id,
            'escalated_by' => $this->manager->id,
            'escalated_to' => $this->manager->id,
            'escalation_level' => 'level_2',
            'reason' => 'Needs senior review',
            'notes' => 'Complex issue',
        ]);

        $this->assertDatabaseHas('incident_assignments', [
            'incident_id' => $incident->id,
            'user_id' => $this->manager->id,
            'assigned_by' => $this->manager->id,
            'role' => 'primary',
            'assignment_reason' => 'Needs senior review',
        ]);

        $this->assertDatabaseHas('incident_timeline', [
            'incident_id' => $incident->id,
            'event_type' => 'escalated',
            'user_id' => $this->manager->id,
        ]);
    }

    /**
     * Test: Can close incident
     */
    public function test_can_close_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'status' => 'resolved', 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson("/api/incidents/{$incident->id}/close", [
                'resolution_summary' => 'Issue resolved and verified',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.resolution_summary', 'Issue resolved and verified');

        $this->assertDatabaseHas('incident_timeline', [
            'incident_id' => $incident->id,
            'event_type' => 'status_changed',
            'user_id' => $this->technician->id,
        ]);
    }

    /**
     * Test: Filter by SLA breached
     */
    public function test_can_filter_sla_breached_incidents(): void
    {
        Incident::factory(2)->create(['tenant_id' => 1, 'sla_breached' => true, 'reported_by' => $this->admin->id]);
        Incident::factory(3)->create(['tenant_id' => 1, 'sla_breached' => false, 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents?sla_breached=true');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);
    }

    /**
     * Test: Fulltext search in incidents
     */
    public function test_fulltext_search_in_incidents(): void
    {
        Incident::factory()->create(['tenant_id' => 1, 'title' => 'Database Connection Failed', 'reported_by' => $this->admin->id]);
        Incident::factory()->create(['tenant_id' => 1, 'title' => 'Network Timeout', 'reported_by' => $this->admin->id]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents?search=Database');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);
    }

    public function test_can_sort_incidents_by_severity_desc(): void
    {
        $low = Incident::factory()->create([
            'tenant_id' => 1,
            'severity' => 'low',
            'reported_by' => $this->admin->id,
            'reported_at' => now()->subMinutes(2),
        ]);
        $medium = Incident::factory()->create([
            'tenant_id' => 1,
            'severity' => 'medium',
            'reported_by' => $this->admin->id,
            'reported_at' => now()->subMinute(),
        ]);
        $critical = Incident::factory()->create([
            'tenant_id' => 1,
            'severity' => 'critical',
            'reported_by' => $this->admin->id,
            'reported_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/incidents?sort=severity:desc&per_page=100')
            ->assertStatus(200);

        $orderedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame($critical->id, $orderedIds[0]);
        $this->assertSame($medium->id, $orderedIds[1]);
        $this->assertSame($low->id, $orderedIds[2]);
    }

    public function test_can_restore_soft_deleted_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/incidents/{$incident->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('incidents', ['id' => $incident->id]);

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/incidents/{$incident->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $incident->id);

        $this->assertDatabaseHas('incidents', ['id' => $incident->id, 'deleted_at' => null]);
    }

    public function test_hard_delete_requires_soft_delete(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/incidents/{$incident->id}/hard-delete")
            ->assertStatus(422);
    }

    public function test_can_list_timeline_assignments_escalations_and_comments(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $this->actingAs($this->manager, 'web')
            ->postJson("/api/incidents/{$incident->id}/escalate", [
                'escalated_to' => $this->manager->id,
                'escalation_level' => 'level_2',
                'reason' => 'Needs manager ownership',
            ])
            ->assertStatus(200);

        $this->actingAs($this->admin, 'web')
            ->postJson("/api/incidents/{$incident->id}/comments", [
                'comment' => 'Investigating root cause',
                'is_internal' => true,
            ])
            ->assertStatus(201);

        $timelineResponse = $this->actingAs($this->admin, 'web')
            ->getJson("/api/incidents/{$incident->id}/timeline")
            ->assertStatus(200);

        $timelineTypes = collect($timelineResponse->json('data'))->pluck('event_type')->all();
        $this->assertContains('assigned', $timelineTypes);
        $this->assertContains('escalated', $timelineTypes);

        $this->actingAs($this->admin, 'web')
            ->getJson("/api/incidents/{$incident->id}/assignments")
            ->assertStatus(200)
            ->assertJsonPath('data.0.user.id', $this->manager->id);

        $this->actingAs($this->admin, 'web')
            ->getJson("/api/incidents/{$incident->id}/escalations")
            ->assertStatus(200)
            ->assertJsonPath('data.0.escalation_level', 'level_2');

        $this->actingAs($this->admin, 'web')
            ->getJson("/api/incidents/{$incident->id}/comments")
            ->assertStatus(200)
            ->assertJsonPath('data.0.comment', 'Investigating root cause');
    }

    public function test_can_add_comment_to_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $this->actingAs($this->technician, 'web')
            ->postJson("/api/incidents/{$incident->id}/comments", [
                'comment' => 'Temporary mitigation applied',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.comment', 'Temporary mitigation applied');

        $this->assertDatabaseHas('incident_comments', [
            'incident_id' => $incident->id,
            'user_id' => $this->technician->id,
            'comment' => 'Temporary mitigation applied',
        ]);
    }

    public function test_create_incident_rejects_contract_from_other_tenant(): void
    {
        $foreignContract = Contract::factory()->create(['tenant_id' => 999]);

        $this->actingAs($this->admin, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Cross-tenant FK test',
                'description' => 'Should fail',
                'category' => 'infrastructure',
                'severity' => 'high',
                'priority' => 'high',
                'contract_id' => $foreignContract->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contract_id']);
    }

    public function test_create_incident_generates_next_incident_number(): void
    {
        Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
            'incident_number' => 'INC-000009',
        ]);

        $this->actingAs($this->technician, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Sequential Number Check',
                'description' => 'Ensure numbering increments',
                'category' => 'infrastructure',
                'severity' => 'high',
                'priority' => 'high',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.incident_number', 'INC-000010');
    }

    public function test_update_incident_rejects_cross_tenant_foreign_keys(): void
    {
        $localContract = Contract::factory()->create(['tenant_id' => 1]);
        $incident = Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
            'contract_id' => $localContract->id,
            'assigned_to' => $this->manager->id,
            'asset_id' => null,
        ]);

        $foreignUser = User::factory()->create(['tenant_id' => 999]);
        $foreignContract = Contract::factory()->create(['tenant_id' => 999]);
        $foreignCategory = AssetCategory::factory()->create(['tenant_id' => 999]);
        $foreignAsset = Asset::factory()->create([
            'tenant_id' => 999,
            'category_id' => $foreignCategory->id,
        ]);

        $this->actingAs($this->admin, 'web')
            ->putJson("/api/incidents/{$incident->id}", [
                'assigned_to' => $foreignUser->id,
                'contract_id' => $foreignContract->id,
                'asset_id' => $foreignAsset->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_to', 'contract_id', 'asset_id']);

        $incident->refresh();
        $this->assertSame($this->manager->id, (int) $incident->assigned_to);
        $this->assertSame($localContract->id, (int) $incident->contract_id);
        $this->assertNull($incident->asset_id);
    }

    public function test_create_incident_incident_number_is_unique_in_quick_succession(): void
    {
        $first = $this->actingAs($this->technician, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Quick succession #1',
                'description' => 'First request',
                'category' => 'infrastructure',
                'severity' => 'medium',
                'priority' => 'medium',
            ])
            ->assertStatus(201);

        $second = $this->actingAs($this->technician, 'web')
            ->postJson('/api/incidents', [
                'title' => 'Quick succession #2',
                'description' => 'Second request',
                'category' => 'infrastructure',
                'severity' => 'medium',
                'priority' => 'medium',
            ])
            ->assertStatus(201);

        $firstNumber = (string) $first->json('data.incident_number');
        $secondNumber = (string) $second->json('data.incident_number');

        $this->assertNotSame($firstNumber, $secondNumber);
        $this->assertMatchesRegularExpression('/^INC-\d{6}$/', $firstNumber);
        $this->assertMatchesRegularExpression('/^INC-\d{6}$/', $secondNumber);
    }

    public function test_cross_tenant_user_cannot_show_incident_detail(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignIncident = Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
        ]);

        $this->actingAs($otherTenant, 'web')
            ->getJson("/api/incidents/{$foreignIncident->id}")
            ->assertStatus(404);
    }

    public function test_cross_tenant_user_cannot_update_incident(): void
    {
        $otherTenant = User::factory()->create(['tenant_id' => 999]);

        $foreignIncident = Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
        ]);

        $this->actingAs($otherTenant, 'web')
            ->putJson("/api/incidents/{$foreignIncident->id}", [
                'title' => 'Should not update',
            ])
            ->assertStatus(404);
    }

    public function test_can_update_incident_status_with_reason(): void
    {
        $incident = Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
            'status' => 'open',
        ]);

        $this->actingAs($this->admin, 'web')
            ->putJson("/api/incidents/{$incident->id}", [
                'status' => 'in_progress',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('incidents', [
            'id' => $incident->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('incident_timeline', [
            'incident_id' => $incident->id,
            'event_type' => 'status_changed',
        ]);
    }

    public function test_update_incident_without_status_change_does_not_require_reason(): void
    {
        $incident = Incident::factory()->create([
            'tenant_id' => 1,
            'reported_by' => $this->admin->id,
            'status' => 'open',
            'title' => 'Original title',
        ]);

        $this->actingAs($this->admin, 'web')
            ->putJson("/api/incidents/{$incident->id}", [
                'title' => 'Updated title',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated title');
    }
}
