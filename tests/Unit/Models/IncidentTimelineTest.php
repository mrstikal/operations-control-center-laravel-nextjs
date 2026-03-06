<?php

namespace Tests\Unit\Models;

use App\Models\Incident;
use App\Models\IncidentTimeline;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncidentTimelineTest extends TestCase
{
    /**
     * Test: IncidentTimeline belongs to incident
     */
    public function test_incident_timeline_belongs_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $timeline = IncidentTimeline::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'event_type' => 'created',
            'message' => 'Incident created',
            'occurred_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $timeline->incident());
        $this->assertEquals($incident->id, $timeline->incident->id);
    }

    /**
     * Test: IncidentTimeline belongs to user
     */
    public function test_incident_timeline_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $timeline = IncidentTimeline::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => $user->id,
            'event_type' => 'updated',
            'message' => 'Status changed',
            'occurred_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $timeline->user());
        $this->assertEquals($user->id, $timeline->user->id);
    }

    /**
     * Test: Datetime field is cast to Carbon
     */
    public function test_datetime_field_is_cast_to_carbon(): void
    {
        $timeline = IncidentTimeline::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'event_type' => 'commented',
            'message' => 'Added comment',
            'occurred_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $timeline->occurred_at);
    }

    /**
     * Test: metadata field is cast to json
     */
    public function test_metadata_field_is_cast_to_json(): void
    {
        $timeline = IncidentTimeline::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'event_type' => 'assigned',
            'message' => 'Assigned to user',
            'metadata' => ['assigned_to' => 123, 'role' => 'primary'],
            'occurred_at' => now(),
        ]);

        $this->assertIsArray($timeline->metadata);
        $this->assertSame(['assigned_to' => 123, 'role' => 'primary'], $timeline->metadata);
    }
}
