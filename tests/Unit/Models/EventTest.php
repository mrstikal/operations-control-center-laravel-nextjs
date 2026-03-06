<?php

namespace Tests\Unit\Models;

use App\Models\Event;
use App\Models\User;
use Tests\TestCase;

class EventTest extends TestCase
{
    public function test_scopes_filter_events_correctly(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);

        Event::create([
            'tenant_id' => 1,
            'event_type' => 'IncidentCreated',
            'aggregate_type' => 'Incident',
            'aggregate_id' => 100,
            'user_id' => $user->id,
            'payload' => ['status' => 'open'],
            'metadata' => ['source' => 'api'],
            'correlation_id' => 'corr-1',
            'version' => 1,
            'occurred_at' => now()->subMinute(),
        ]);

        Event::create([
            'tenant_id' => 1,
            'event_type' => 'IncidentUpdated',
            'aggregate_type' => 'Incident',
            'aggregate_id' => 100,
            'user_id' => $user->id,
            'payload' => ['status' => 'in_progress'],
            'metadata' => ['source' => 'api'],
            'correlation_id' => 'corr-1',
            'version' => 2,
            'occurred_at' => now(),
        ]);

        Event::create([
            'tenant_id' => 999,
            'event_type' => 'IncidentCreated',
            'aggregate_type' => 'Incident',
            'aggregate_id' => 100,
            'user_id' => null,
            'payload' => ['status' => 'open'],
            'metadata' => ['source' => 'external'],
            'correlation_id' => 'corr-2',
            'version' => 3,
            'occurred_at' => now(),
        ]);

        $this->assertSame(2, Event::ofTenant(1)->count());
        $this->assertSame(2, Event::forAggregate('Incident', 100)->ofTenant(1)->count());
        $this->assertSame(2, Event::byCorrelation('corr-1')->count());
        $this->assertSame(2, Event::byType('IncidentCreated')->count());
    }

    public function test_get_related_events_and_causation(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);

        $first = Event::create([
            'tenant_id' => 1,
            'event_type' => 'ContractCreated',
            'aggregate_type' => 'Contract',
            'aggregate_id' => 500,
            'user_id' => $user->id,
            'payload' => ['status' => 'draft'],
            'metadata' => ['source' => 'test'],
            'correlation_id' => 'corr-contract-1',
            'version' => 1,
            'occurred_at' => now()->subMinutes(2),
        ]);

        $second = Event::create([
            'tenant_id' => 1,
            'event_type' => 'ContractApproved',
            'aggregate_type' => 'Contract',
            'aggregate_id' => 500,
            'user_id' => $user->id,
            'payload' => ['status' => 'approved'],
            'metadata' => ['source' => 'test'],
            'correlation_id' => 'corr-contract-1',
            'causation_id' => (string) $first->id,
            'version' => 2,
            'occurred_at' => now(),
        ]);

        $related = $second->getRelatedEvents();

        $this->assertCount(2, $related);
        $this->assertSame($first->id, $second->getCausation()?->id);
    }
}
