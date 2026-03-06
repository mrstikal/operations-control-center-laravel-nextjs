<?php

namespace Tests\Unit\Models;

use App\Models\EventProjection;
use Tests\TestCase;

class EventProjectionTest extends TestCase
{
    public function test_active_and_by_name_scopes(): void
    {
        EventProjection::create([
            'tenant_id' => 1,
            'projection_name' => 'contracts_summary',
            'source_event_type' => 'ContractCreated',
            'last_processed_event_id' => 10,
            'last_processed_version' => 2,
            'projection_state' => ['count' => 5],
            'is_active' => true,
        ]);

        EventProjection::create([
            'tenant_id' => 1,
            'projection_name' => 'incidents_summary',
            'source_event_type' => 'IncidentCreated',
            'last_processed_event_id' => 11,
            'last_processed_version' => 1,
            'projection_state' => ['count' => 2],
            'is_active' => false,
        ]);

        $this->assertSame(1, EventProjection::active()->count());
        $this->assertSame(1, EventProjection::byName('contracts_summary')->count());
    }

    public function test_update_projection_and_reset(): void
    {
        $projection = EventProjection::create([
            'tenant_id' => 1,
            'projection_name' => 'assets_summary',
            'source_event_type' => 'AssetCreated',
            'last_processed_event_id' => 1,
            'last_processed_version' => 1,
            'projection_state' => ['assets_total' => 3],
            'is_active' => true,
        ]);

        $projection->updateProjection(15, 4, ['assets_total' => 9]);

        $this->assertSame(15, $projection->fresh()->last_processed_event_id);
        $this->assertSame(4, $projection->fresh()->last_processed_version);
        $this->assertSame(9, data_get($projection->fresh()->projection_state, 'assets_total'));

        $projection->reset();

        $this->assertSame(0, $projection->fresh()->last_processed_event_id);
        $this->assertSame(0, $projection->fresh()->last_processed_version);
        $this->assertNull($projection->fresh()->projection_state);
    }
}
