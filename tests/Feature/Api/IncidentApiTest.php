<?php

namespace Tests\Feature\Api;

use App\Models\Incident;
use App\Models\Role;
use App\Models\User;
use Tests\TestCase;

class IncidentApiTest extends TestCase
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
     * Test: Can list incidents
     */
    public function test_can_list_incidents(): void
    {
        Incident::factory(5)->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/incidents');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'message', 'data', 'pagination'])
            ->assertJsonPath('pagination.total', 5);
    }

    /**
     * Test: Filter incidents by severity
     */
    public function test_can_filter_incidents_by_severity(): void
    {
        Incident::factory(3)->create(['tenant_id' => 1, 'severity' => 'critical', 'reported_by' => $this->admin->id]);
        Incident::factory(2)->create(['tenant_id' => 1, 'severity' => 'low', 'reported_by' => $this->admin->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/incidents?severity=critical');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 3);
    }

    /**
     * Test: Can create incident
     */
    public function test_can_create_incident(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->technicianToken}")
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

        $this->assertDatabaseHas('incidents', [
            'title' => 'Server Down',
        ]);
    }

    /**
     * Test: Can view incident detail
     */
    public function test_can_view_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'reported_by' => $this->admin->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
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

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/incidents/{$incident->id}/escalate", [
                'escalated_to' => $this->manager->id,
                'escalation_level' => 'level_2',
                'reason' => 'Needs senior review',
                'notes' => 'Complex issue',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'escalated');
    }

    /**
     * Test: Can close incident
     */
    public function test_can_close_incident(): void
    {
        $incident = Incident::factory()->create(['tenant_id' => 1, 'status' => 'resolved', 'reported_by' => $this->admin->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->technicianToken}")
            ->postJson("/api/incidents/{$incident->id}/close", [
                'resolution_summary' => 'Issue resolved and verified',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.resolution_summary', 'Issue resolved and verified');
    }

    /**
     * Test: Filter by SLA breached
     */
    public function test_can_filter_sla_breached_incidents(): void
    {
        Incident::factory(2)->create(['tenant_id' => 1, 'sla_breached' => true, 'reported_by' => $this->admin->id]);
        Incident::factory(3)->create(['tenant_id' => 1, 'sla_breached' => false, 'reported_by' => $this->admin->id]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
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

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/incidents?search=Database');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);
    }
}

