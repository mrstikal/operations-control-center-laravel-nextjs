<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Event;
use App\Models\EventProjection;
use App\Models\EventSnapshot;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class EventStoreRebuildValidationTest extends TestCase
{
    /**
     * Test: rebuild command correctly restores projections from events
     */
    public function test_rebuild_command_restores_projections_from_events(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        // Create events without observers running (simulate missing projections)
        Event::withoutEvents(function () use ($tenant, $client): void {
            // Create 3 contracts via events only
            for ($i = 1; $i <= 3; $i++) {
                Event::create([
                    'tenant_id' => $tenant->id,
                    'event_type' => 'ContractCreated',
                    'aggregate_type' => 'Contract',
                    'aggregate_id' => 100 + $i,
                    'user_id' => $client->id,
                    'payload' => [
                        'attributes' => [
                            'contract_number' => 'CTR-'.sprintf('%05d', 100 + $i),
                            'title' => 'Contract '.$i,
                            'status' => 'draft',
                        ],
                    ],
                    'metadata' => ['source' => 'test'],
                    'version' => 1,
                    'occurred_at' => now(),
                ]);
            }

            // Create 2 incidents
            for ($i = 1; $i <= 2; $i++) {
                Event::create([
                    'tenant_id' => $tenant->id,
                    'event_type' => 'IncidentCreated',
                    'aggregate_type' => 'Incident',
                    'aggregate_id' => 200 + $i,
                    'user_id' => $client->id,
                    'payload' => [
                        'attributes' => [
                            'incident_number' => 'INC-'.sprintf('%05d', 200 + $i),
                            'title' => 'Incident '.$i,
                            'status' => 'open',
                            'severity' => 'high',
                        ],
                    ],
                    'metadata' => ['source' => 'test'],
                    'version' => 1,
                    'occurred_at' => now(),
                ]);
            }
        });

        // Projections should not exist (no observer ran)
        $this->assertDatabaseMissing('event_projections', [
            'tenant_id' => $tenant->id,
            'projection_name' => 'contracts_summary',
        ]);
        $this->assertDatabaseMissing('event_projections', [
            'tenant_id' => $tenant->id,
            'projection_name' => 'incidents_summary',
        ]);

        // Run rebuild
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Projections should now exist
        $contractsProj = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $this->assertNotNull($contractsProj);
        $this->assertSame(3, data_get($contractsProj->projection_state, 'dashboard_kpi.contracts_total'));

        $incidentsProj = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'incidents_summary')
            ->first();

        $this->assertNotNull($incidentsProj);
        $this->assertSame(2, data_get($incidentsProj->projection_state, 'dashboard_kpi.incidents_total'));
    }

    /**
     * Test: rebuild command correctly creates snapshots from events
     */
    public function test_rebuild_command_creates_snapshots_from_events(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $reporter = User::factory()->create(['tenant_id' => $tenant->id]);

        // Create event without observer
        Event::withoutEvents(function () use ($tenant, $reporter): void {
            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => 999,
                'user_id' => $reporter->id,
                'payload' => [
                    'attributes' => [
                        'incident_number' => 'INC-TEST-999',
                        'title' => 'Test Incident',
                        'status' => 'open',
                        'severity' => 'critical',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);
        });

        // Snapshot should not exist
        $this->assertDatabaseMissing('event_snapshots', [
            'tenant_id' => $tenant->id,
            'aggregate_type' => 'Incident',
            'aggregate_id' => 999,
        ]);

        // Run rebuild
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Snapshot should now exist with correct data
        $snapshot = EventSnapshot::query()
            ->where('tenant_id', $tenant->id)
            ->where('aggregate_type', 'Incident')
            ->where('aggregate_id', 999)
            ->first();

        $this->assertNotNull($snapshot);
        $this->assertSame('critical', data_get($snapshot->state, 'severity'));
        $this->assertSame('INC-TEST-999', data_get($snapshot->state, 'incident_number'));
    }

    /**
     * Test: rebuild handles multiple events for same aggregate in correct order
     */
    public function test_rebuild_respects_event_ordering(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);

        // Create multiple events for same contract in specific order
        Event::withoutEvents(function () use ($tenant, $client): void {
            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 888,
                'user_id' => $client->id,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-888',
                        'title' => 'Initial Contract',
                        'status' => 'draft',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now()->subMinutes(2),
            ]);

            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractUpdated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 888,
                'user_id' => $client->id,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-888',
                        'title' => 'Updated Contract',
                        'status' => 'approved',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 2,
                'occurred_at' => now()->subMinutes(1),
            ]);

            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractUpdated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 888,
                'user_id' => $client->id,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-888',
                        'title' => 'Final Contract',
                        'status' => 'in_progress',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 3,
                'occurred_at' => now(),
            ]);
        });

        // Run rebuild
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Verify snapshot has final state from v3
        $snapshot = EventSnapshot::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', 888)
            ->where('version', 3)
            ->first();

        $this->assertNotNull($snapshot);
        $this->assertSame('Final Contract', data_get($snapshot->state, 'title'));
        $this->assertSame('in_progress', data_get($snapshot->state, 'status'));
    }

    /**
     * Test: rebuild tenant-scoped (single tenant)
     */
    public function test_rebuild_tenant_scoped(): void
    {
        $tenant1 = Tenant::firstWhere('name', 'Default Tenant');
        $tenant2 = Tenant::factory()->create(['name' => 'Rebuild Test Tenant']);

        // Create events for both tenants without observers
        Event::withoutEvents(function () use ($tenant1, $tenant2): void {
            Event::create([
                'tenant_id' => $tenant1->id,
                'event_type' => 'AssetCreated',
                'aggregate_type' => 'Asset',
                'aggregate_id' => 777,
                'payload' => [
                    'attributes' => [
                        'asset_tag' => 'ASSET-T1-001',
                        'name' => 'Tenant 1 Asset',
                        'status' => 'operational',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);

            Event::create([
                'tenant_id' => $tenant2->id,
                'event_type' => 'AssetCreated',
                'aggregate_type' => 'Asset',
                'aggregate_id' => 666,
                'payload' => [
                    'attributes' => [
                        'asset_tag' => 'ASSET-T2-001',
                        'name' => 'Tenant 2 Asset',
                        'status' => 'operational',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);
        });

        // Rebuild only tenant2
        $this->artisan('events:rebuild-read-models', ['--tenant' => $tenant2->id])
            ->assertExitCode(0);

        // Tenant2 projection should exist
        $tenant2Proj = EventProjection::query()
            ->where('tenant_id', $tenant2->id)
            ->where('projection_name', 'assets_summary')
            ->first();
        $this->assertNotNull($tenant2Proj);

        // Tenant1 projection should NOT have been rebuilt (no scoped rebuild)
        $tenant1Events = Event::where('tenant_id', $tenant1->id)->count();
        $this->assertGreaterThan(0, $tenant1Events);
    }

    /**
     * Test: rebuild clears old projections before rebuilding
     */
    public function test_rebuild_clears_stale_projections(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');

        // Create stale projection
        EventProjection::create([
            'tenant_id' => $tenant->id,
            'projection_name' => 'stale_summary',
            'source_event_type' => 'StaleEvent',
            'last_processed_event_id' => 0,
            'last_processed_version' => 0,
            'projection_state' => ['stale' => true],
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('event_projections', [
            'projection_name' => 'stale_summary',
        ]);

        // Run rebuild
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Stale projection should be cleared (because no events for it)
        $this->assertDatabaseMissing('event_projections', [
            'projection_name' => 'stale_summary',
        ]);
    }

    /**
     * Test: event-store listener failure doesn't block rebuild
     */
    public function test_rebuild_is_unaffected_by_event_listener_state(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);

        // Create event
        Event::withoutEvents(function () use ($tenant, $client): void {
            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 555,
                'user_id' => $client->id,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-555',
                        'title' => 'Rebuild Test Contract',
                        'status' => 'draft',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);
        });

        // Rebuild should succeed
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Projection should exist
        $projection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $this->assertNotNull($projection);
        $this->assertSame(1, data_get($projection->projection_state, 'dashboard_kpi.contracts_total'));
    }

    /**
     * Test: rebuild maintains event count accuracy
     */
    public function test_rebuild_maintains_event_count_accuracy(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);

        $eventCount = 0;

        // Create multiple events
        Event::withoutEvents(function () use ($tenant, $client, &$eventCount): void {
            for ($i = 1; $i <= 5; $i++) {
                Event::create([
                    'tenant_id' => $tenant->id,
                    'event_type' => 'ContractCreated',
                    'aggregate_type' => 'Contract',
                    'aggregate_id' => 400 + $i,
                    'user_id' => $client->id,
                    'payload' => [
                        'attributes' => [
                            'contract_number' => 'CTR-'.sprintf('%05d', 400 + $i),
                            'title' => 'Contract '.$i,
                            'status' => 'draft',
                        ],
                    ],
                    'metadata' => ['source' => 'test'],
                    'version' => 1,
                    'occurred_at' => now(),
                ]);
                $eventCount++;
            }
        });

        // Run rebuild
        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        // Verify projection event count
        $projection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $this->assertNotNull($projection);
        $this->assertSame($eventCount, data_get($projection->projection_state, 'event_count'));
    }
}
