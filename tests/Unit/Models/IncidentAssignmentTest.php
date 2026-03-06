<?php

namespace Tests\Unit\Models;

use App\Models\Incident;
use App\Models\IncidentAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncidentAssignmentTest extends TestCase
{
    /**
     * Test: IncidentAssignment belongs to incident
     */
    public function test_incident_assignment_belongs_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $assignment = IncidentAssignment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $assignment->incident());
        $this->assertEquals($incident->id, $assignment->incident->id);
    }

    /**
     * Test: IncidentAssignment belongs to user
     */
    public function test_incident_assignment_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $assignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => $user->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $assignment->user());
        $this->assertEquals($user->id, $assignment->user->id);
    }

    /**
     * Test: IncidentAssignment belongs to assignedBy user
     */
    public function test_incident_assignment_belongs_to_assigned_by_user(): void
    {
        $assignedBy = User::factory()->create();
        $assignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => $assignedBy->id,
            'role' => 'secondary',
            'assigned_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $assignment->assignedBy());
        $this->assertEquals($assignedBy->id, $assignment->assignedBy->id);
    }

    /**
     * Test: Can unassign assignment
     */
    public function test_can_unassign_assignment(): void
    {
        $assignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
        ]);

        $this->assertNull($assignment->unassigned_at);

        $assignment->unassign();

        $this->assertNotNull($assignment->fresh()->unassigned_at);
        $this->assertInstanceOf(Carbon::class, $assignment->fresh()->unassigned_at);
    }

    /**
     * Test: Can check if assignment is active
     */
    public function test_can_check_if_assignment_is_active(): void
    {
        $activeAssignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
        ]);

        $inactiveAssignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
            'unassigned_at' => now(),
        ]);

        $this->assertTrue($activeAssignment->isActive());
        $this->assertFalse($inactiveAssignment->isActive());
    }

    /**
     * Test: Datetime fields are cast to Carbon
     */
    public function test_datetime_fields_are_cast_to_carbon(): void
    {
        $assignment = IncidentAssignment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'assigned_by' => User::factory()->create()->id,
            'role' => 'primary',
            'assigned_at' => now(),
            'unassigned_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $assignment->assigned_at);
        $this->assertInstanceOf(Carbon::class, $assignment->unassigned_at);
    }
}
