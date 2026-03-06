<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\IncidentAssignment;
use App\Models\IncidentComment;
use App\Models\IncidentEscalation;
use App\Models\IncidentTimeline;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncidentTest extends TestCase
{
    /**
     * Test: Incident belongs to tenant
     */
    public function test_incident_belongs_to_tenant(): void
    {
        $incident = Incident::factory()->create();

        $this->assertInstanceOf(BelongsTo::class, $incident->tenant());
        $this->assertInstanceOf(Tenant::class, $incident->tenant);
    }

    /**
     * Test: Incident belongs to reportedBy user
     */
    public function test_incident_belongs_to_reported_by_user(): void
    {
        $reporter = User::factory()->create();
        $incident = Incident::factory()->create(['reported_by' => $reporter->id]);

        $this->assertInstanceOf(BelongsTo::class, $incident->reportedBy());
        $this->assertEquals($reporter->id, $incident->reportedBy->id);
    }

    /**
     * Test: Incident belongs to assignedTo user
     */
    public function test_incident_belongs_to_assigned_to_user(): void
    {
        $assignedUser = User::factory()->create();
        $incident = Incident::factory()->create(['assigned_to' => $assignedUser->id]);

        $this->assertInstanceOf(BelongsTo::class, $incident->assignedTo());
        $this->assertEquals($assignedUser->id, $incident->assignedTo->id);
    }

    /**
     * Test: Incident belongs to escalatedTo user
     */
    public function test_incident_belongs_to_escalated_to_user(): void
    {
        $escalatedUser = User::factory()->create();
        $incident = Incident::factory()->create(['escalated_to' => $escalatedUser->id]);

        $this->assertInstanceOf(BelongsTo::class, $incident->escalatedTo());
        $this->assertEquals($escalatedUser->id, $incident->escalatedTo->id);
    }

    /**
     * Test: Incident belongs to contract
     */
    public function test_incident_belongs_to_contract(): void
    {
        $contract = Contract::factory()->create();
        $incident = Incident::factory()->create(['contract_id' => $contract->id]);

        $this->assertInstanceOf(BelongsTo::class, $incident->contract());
        $this->assertEquals($contract->id, $incident->contract->id);
    }

    /**
     * Test: Incident belongs to asset
     */
    public function test_incident_belongs_to_asset(): void
    {
        $asset = Asset::factory()->create();
        $incident = Incident::factory()->create(['asset_id' => $asset->id]);

        $this->assertInstanceOf(BelongsTo::class, $incident->asset());
        $this->assertEquals($asset->id, $incident->asset->id);
    }

    /**
     * Test: Incident has many timeline events ordered by occurred_at asc
     */
    public function test_incident_has_many_timeline_events(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();

        IncidentTimeline::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'event_type' => 'created',
            'message' => 'First event',
            'occurred_at' => now()->subMinutes(10),
        ]);

        IncidentTimeline::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'event_type' => 'updated',
            'message' => 'Second event',
            'occurred_at' => now(),
        ]);

        $this->assertInstanceOf(HasMany::class, $incident->timeline());
        $this->assertCount(2, $incident->timeline);
        $this->assertEquals('First event', $incident->timeline->first()->message);
    }

    /**
     * Test: Incident has many assignments
     */
    public function test_incident_has_many_assignments(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();
        $assignedBy = User::factory()->create();

        IncidentAssignment::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'assigned_by' => $assignedBy->id,
            'role' => 'primary',
            'assigned_at' => now(),
        ]);

        $this->assertInstanceOf(HasMany::class, $incident->assignments());
        $this->assertCount(1, $incident->assignments);
    }

    /**
     * Test: Incident has many escalations ordered by escalated_at desc
     */
    public function test_incident_has_many_escalations(): void
    {
        $incident = Incident::factory()->create();
        $escalatedBy = User::factory()->create();
        $escalatedTo = User::factory()->create();

        IncidentEscalation::create([
            'incident_id' => $incident->id,
            'escalated_by' => $escalatedBy->id,
            'escalated_to' => $escalatedTo->id,
            'escalation_level' => 'level_2',
            'reason' => 'Complexity',
            'escalated_at' => now()->subHour(),
        ]);

        IncidentEscalation::create([
            'incident_id' => $incident->id,
            'escalated_by' => $escalatedBy->id,
            'escalated_to' => $escalatedTo->id,
            'escalation_level' => 'level_3',
            'reason' => 'Urgency',
            'escalated_at' => now(),
        ]);

        $this->assertInstanceOf(HasMany::class, $incident->escalations());
        $this->assertCount(2, $incident->escalations);
        $this->assertEquals('level_3', $incident->escalations->first()->escalation_level);
    }

    /**
     * Test: Incident has many comments ordered by commented_at desc
     */
    public function test_incident_has_many_comments(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'comment' => 'First comment',
            'commented_at' => now()->subMinutes(5),
        ]);

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'comment' => 'Second comment',
            'commented_at' => now(),
        ]);

        $this->assertInstanceOf(HasMany::class, $incident->comments());
        $this->assertCount(2, $incident->comments);
        $this->assertEquals('Second comment', $incident->comments->first()->comment);
    }

    /**
     * Test: Scope ofTenant filters by tenant_id
     */
    public function test_scope_of_tenant_filters_by_tenant_id(): void
    {
        Incident::factory(3)->create(['tenant_id' => 1]);
        Incident::factory(2)->create(['tenant_id' => 999]);

        $this->assertEquals(3, Incident::ofTenant(1)->count());
        $this->assertEquals(2, Incident::ofTenant(999)->count());
    }

    /**
     * Test: Scope byStatus filters by status
     */
    public function test_scope_by_status_filters_by_status(): void
    {
        Incident::factory(2)->create(['status' => 'open']);
        Incident::factory(3)->create(['status' => 'in_progress']);

        $this->assertEquals(2, Incident::byStatus('open')->count());
        $this->assertEquals(3, Incident::byStatus('in_progress')->count());
    }

    /**
     * Test: Scope open returns open/in_progress/escalated incidents
     */
    public function test_scope_open_returns_open_statuses(): void
    {
        Incident::factory()->create(['status' => 'open']);
        Incident::factory()->create(['status' => 'in_progress']);
        Incident::factory()->create(['status' => 'escalated']);
        Incident::factory()->create(['status' => 'resolved']);
        Incident::factory()->create(['status' => 'closed']);

        $this->assertEquals(3, Incident::open()->count());
    }

    /**
     * Test: Scope slaBreach returns breached incidents
     */
    public function test_scope_sla_breach_returns_only_breached(): void
    {
        Incident::factory(2)->create(['sla_breached' => true]);
        Incident::factory(3)->create(['sla_breached' => false]);

        $this->assertEquals(2, Incident::slaBreach()->count());
    }

    /**
     * Test: Scope highPriority returns high/critical priority
     */
    public function test_scope_high_priority_returns_high_and_critical(): void
    {
        Incident::factory()->create(['priority' => 'low']);
        Incident::factory()->create(['priority' => 'medium']);
        Incident::factory()->create(['priority' => 'high']);
        Incident::factory()->create(['priority' => 'critical']);

        $this->assertEquals(2, Incident::highPriority()->count());
    }

    /**
     * Test: Can assign incident to user
     */
    public function test_can_assign_incident_to_user(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();
        $assignedBy = User::factory()->create();

        $incident->assignTo($user, $assignedBy, 'primary', 'Assigned for investigation');

        $this->assertEquals($user->id, $incident->fresh()->assigned_to);
        $this->assertDatabaseHas('incident_assignments', [
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'role' => 'primary',
        ]);
    }

    /**
     * Test: Can escalate incident
     */
    public function test_can_escalate_incident(): void
    {
        $incident = Incident::factory()->create(['status' => 'open']);
        $escalatedBy = User::factory()->create();
        $escalatedTo = User::factory()->create();

        $incident->escalate($escalatedBy, $escalatedTo, 'level_2', 'Requires specialist', 'Complex issue');

        $this->assertEquals('escalated', $incident->fresh()->status);
        $this->assertEquals($escalatedTo->id, $incident->fresh()->escalated_to);
        $this->assertDatabaseHas('incident_escalations', [
            'incident_id' => $incident->id,
            'escalation_level' => 'level_2',
            'reason' => 'Requires specialist',
        ]);
    }

    /**
     * Test: Can add comment to incident
     */
    public function test_can_add_comment_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();

        $comment = $incident->addComment($user, 'This is a test comment', false);

        $this->assertInstanceOf(IncidentComment::class, $comment);
        $this->assertEquals('This is a test comment', $comment->comment);
        $this->assertFalse($comment->is_internal);
    }

    /**
     * Test: Can add internal note to incident
     */
    public function test_can_add_internal_note_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $user = User::factory()->create();

        $comment = $incident->addComment($user, 'Internal note', true);

        $this->assertTrue($comment->is_internal);
    }

    /**
     * Test: Change status updates status and timestamps
     */
    public function test_change_status_updates_status_and_timestamps(): void
    {
        $incident = Incident::factory()->create(['status' => 'open']);

        $incident->changeStatus('resolved');

        $this->assertEquals('resolved', $incident->fresh()->status);
        $this->assertNotNull($incident->fresh()->resolved_at);
    }

    /**
     * Test: Change status to closed sets closed_at
     */
    public function test_change_status_to_closed_sets_closed_at(): void
    {
        $incident = Incident::factory()->create(['status' => 'resolved']);

        $incident->changeStatus('closed');

        $this->assertEquals('closed', $incident->fresh()->status);
        $this->assertNotNull($incident->fresh()->closed_at);
    }

    /**
     * Test: Can check if response SLA is breached
     */
    public function test_can_check_if_response_sla_is_breached(): void
    {
        $breachedIncident = Incident::factory()->create([
            'sla_response_deadline' => now()->subMinutes(10),
        ]);

        $validIncident = Incident::factory()->create([
            'sla_response_deadline' => now()->addMinutes(30),
        ]);

        $this->assertTrue($breachedIncident->isResponseSlaBreach());
        $this->assertFalse($validIncident->isResponseSlaBreach());
    }

    /**
     * Test: Can check if resolution SLA is breached
     */
    public function test_can_check_if_resolution_sla_is_breached(): void
    {
        $breachedIncident = Incident::factory()->create([
            'sla_resolution_deadline' => now()->subHour(),
        ]);

        $validIncident = Incident::factory()->create([
            'sla_resolution_deadline' => now()->addHours(2),
        ]);

        $this->assertTrue($breachedIncident->isResolutionSlaBreach());
        $this->assertFalse($validIncident->isResolutionSlaBreach());
    }

    /**
     * Test: Can calculate time elapsed since reporting
     */
    public function test_can_calculate_time_elapsed(): void
    {
        $incident = Incident::factory()->create([
            'reported_at' => now()->subMinutes(45),
        ]);

        $elapsed = $incident->timeElapsed();

        $this->assertTrue($elapsed >= 44 && $elapsed <= 46);
    }

    /**
     * Test: Can calculate remaining SLA time
     */
    public function test_can_calculate_remaining_sla_time(): void
    {
        $incident = Incident::factory()->create([
            'sla_resolution_deadline' => now()->addMinutes(120),
        ]);

        $remaining = $incident->remainingSlaTime();

        $this->assertTrue($remaining >= 119 && $remaining <= 121);
    }

    /**
     * Test: Remaining SLA time returns null when no deadline
     */
    public function test_remaining_sla_time_returns_null_when_no_deadline(): void
    {
        $incident = Incident::factory()->create([
            'sla_resolution_deadline' => null,
        ]);

        $this->assertNull($incident->remainingSlaTime());
    }

    /**
     * Test: Datetime fields are cast to Carbon
     */
    public function test_datetime_fields_are_cast_to_carbon(): void
    {
        $incident = Incident::factory()->create();

        $this->assertInstanceOf(Carbon::class, $incident->reported_at);
        $this->assertInstanceOf(Carbon::class, $incident->sla_response_deadline);
        $this->assertInstanceOf(Carbon::class, $incident->sla_resolution_deadline);
    }

    /**
     * Test: JSON fields are cast correctly
     */
    public function test_json_fields_are_cast_correctly(): void
    {
        $incident = Incident::factory()->create([
            'tags' => ['urgent', 'vip'],
            'custom_fields' => ['priority_flag' => true],
        ]);

        $this->assertIsArray($incident->tags);
        $this->assertIsArray($incident->custom_fields);
        $this->assertSame(['urgent', 'vip'], $incident->tags);
        $this->assertSame(['priority_flag' => true], $incident->custom_fields);
    }
}
