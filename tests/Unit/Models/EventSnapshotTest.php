<?php

namespace Tests\Unit\Models;

use App\Models\EventSnapshot;
use Tests\TestCase;

class EventSnapshotTest extends TestCase
{
    public function test_for_aggregate_scope_filters_snapshots(): void
    {
        EventSnapshot::create([
            'tenant_id' => 1,
            'aggregate_type' => 'Incident',
            'aggregate_id' => 77,
            'version' => 1,
            'state' => ['status' => 'open'],
            'created_at' => now()->subMinute(),
        ]);

        EventSnapshot::create([
            'tenant_id' => 1,
            'aggregate_type' => 'Incident',
            'aggregate_id' => 77,
            'version' => 2,
            'state' => ['status' => 'resolved'],
            'created_at' => now(),
        ]);

        EventSnapshot::create([
            'tenant_id' => 1,
            'aggregate_type' => 'Contract',
            'aggregate_id' => 88,
            'version' => 1,
            'state' => ['status' => 'draft'],
            'created_at' => now(),
        ]);

        $this->assertSame(2, EventSnapshot::forAggregate('Incident', 77)->count());
    }

    public function test_latest_for_scope_returns_latest_version_snapshot(): void
    {
        EventSnapshot::create([
            'tenant_id' => 1,
            'aggregate_type' => 'Asset',
            'aggregate_id' => 501,
            'version' => 1,
            'state' => ['status' => 'operational'],
            'created_at' => now()->subMinutes(3),
        ]);

        EventSnapshot::create([
            'tenant_id' => 1,
            'aggregate_type' => 'Asset',
            'aggregate_id' => 501,
            'version' => 3,
            'state' => ['status' => 'maintenance'],
            'created_at' => now()->subMinute(),
        ]);

        $latest = EventSnapshot::latestFor('Asset', 501);

        $this->assertNotNull($latest);
        $this->assertSame(3, $latest->version);
        $this->assertSame('maintenance', data_get($latest->state, 'status'));
    }
}
