<?php

namespace Tests\Unit\Models;

use App\Models\Incident;
use App\Models\IncidentComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncidentCommentTest extends TestCase
{
    /**
     * Test: IncidentComment belongs to incident
     */
    public function test_incident_comment_belongs_to_incident(): void
    {
        $incident = Incident::factory()->create();
        $comment = IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Test comment',
            'is_internal' => false,
            'commented_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $comment->incident());
        $this->assertEquals($incident->id, $comment->incident->id);
    }

    /**
     * Test: IncidentComment belongs to user
     */
    public function test_incident_comment_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $comment = IncidentComment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => $user->id,
            'comment' => 'Another comment',
            'is_internal' => true,
            'commented_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $comment->user());
        $this->assertEquals($user->id, $comment->user->id);
    }

    /**
     * Test: Scope public filters public comments
     */
    public function test_scope_public_filters_public_comments(): void
    {
        $incident = Incident::factory()->create();

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Public 1',
            'is_internal' => false,
            'commented_at' => now(),
        ]);

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Public 2',
            'is_internal' => false,
            'commented_at' => now(),
        ]);

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Internal 1',
            'is_internal' => true,
            'commented_at' => now(),
        ]);

        $this->assertEquals(2, IncidentComment::public()->count());
    }

    /**
     * Test: Scope internal filters internal comments
     */
    public function test_scope_internal_filters_internal_comments(): void
    {
        $incident = Incident::factory()->create();

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Internal 1',
            'is_internal' => true,
            'commented_at' => now(),
        ]);

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Internal 2',
            'is_internal' => true,
            'commented_at' => now(),
        ]);

        IncidentComment::create([
            'incident_id' => $incident->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Public 1',
            'is_internal' => false,
            'commented_at' => now(),
        ]);

        $this->assertEquals(2, IncidentComment::internal()->count());
    }

    /**
     * Test: Datetime field is cast to Carbon
     */
    public function test_datetime_field_is_cast_to_carbon(): void
    {
        $comment = IncidentComment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Test',
            'is_internal' => false,
            'commented_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $comment->commented_at);
    }

    /**
     * Test: Boolean and JSON fields are cast correctly
     */
    public function test_boolean_and_json_fields_are_cast_correctly(): void
    {
        $comment = IncidentComment::create([
            'incident_id' => Incident::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'comment' => 'Comment with attachments',
            'is_internal' => 1,
            'attachments' => ['file1.pdf', 'screenshot.png'],
            'commented_at' => now(),
        ]);

        $this->assertIsBool($comment->is_internal);
        $this->assertTrue($comment->is_internal);
        $this->assertIsArray($comment->attachments);
        $this->assertSame(['file1.pdf', 'screenshot.png'], $comment->attachments);
    }
}
