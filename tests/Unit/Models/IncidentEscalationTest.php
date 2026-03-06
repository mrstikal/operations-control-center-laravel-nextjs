<?php

namespace Tests\Unit\Models;

use App\Models\Incident;
use App\Models\IncidentEscalation;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncidentEscalationTest extends TestCase
{
    /**
     * Test: IncidentEscalation belongs to incident
     */
    public function test_incident_escalation_belongs_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $escalation = IncidentEscalation::create([
            'incident_id' => $incident->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_2',
            'reason' => 'Complexity',
            'escalated_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $escalation->incident());
        $this->assertEquals($incident->id, $escalation->incident->id);
    }

    /**
     * Test: IncidentEscalation belongs to escalatedBy user
     */
    public function test_incident_escalation_belongs_to_escalated_by_user(): void
    {
        $escalatedBy = User::factory()->create();
        $escalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => $escalatedBy->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_3',
            'reason' => 'Urgency',
            'escalated_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $escalation->escalatedBy());
        $this->assertEquals($escalatedBy->id, $escalation->escalatedBy->id);
    }

    /**
     * Test: IncidentEscalation belongs to escalatedTo user
     */
    public function test_incident_escalation_belongs_to_escalated_to_user(): void
    {
        $escalatedTo = User::factory()->create();
        $escalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => $escalatedTo->id,
            'escalation_level' => 'level_4',
            'reason' => 'Critical',
            'escalated_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $escalation->escalatedTo());
        $this->assertEquals($escalatedTo->id, $escalation->escalatedTo->id);
    }

    /**
     * Test: Can resolve escalation
     */
    public function test_can_resolve_escalation(): void
    {
        $escalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_2',
            'reason' => 'Test',
            'escalated_at' => now(),
        ]);

        $this->assertNull($escalation->resolved_at);

        $escalation->resolve();

        $this->assertNotNull($escalation->fresh()->resolved_at);
        $this->assertInstanceOf(Carbon::class, $escalation->fresh()->resolved_at);
    }

    /**
     * Test: Can check if escalation is active
     */
    public function test_can_check_if_escalation_is_active(): void
    {
        $activeEscalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_2',
            'reason' => 'Active',
            'escalated_at' => now(),
        ]);

        $resolvedEscalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_3',
            'reason' => 'Resolved',
            'escalated_at' => now(),
            'resolved_at' => now(),
        ]);

        $this->assertTrue($activeEscalation->isActive());
        $this->assertFalse($resolvedEscalation->isActive());
    }

    /**
     * Test: Datetime fields are cast to Carbon
     */
    public function test_datetime_fields_are_cast_to_carbon(): void
    {
        $escalation = IncidentEscalation::create([
            'incident_id' => Incident::factory()->create()->id,
            'escalated_by' => User::factory()->create()->id,
            'escalated_to' => User::factory()->create()->id,
            'escalation_level' => 'level_2',
            'reason' => 'Test',
            'escalated_at' => now(),
            'resolved_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $escalation->escalated_at);
        $this->assertInstanceOf(Carbon::class, $escalation->resolved_at);
    }
}
