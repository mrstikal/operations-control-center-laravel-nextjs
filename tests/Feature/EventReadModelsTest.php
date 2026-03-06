<?php

namespace Tests\Feature;

use App\Events\ContractUpdated;
use App\Listeners\StoreAggregateEvent;
use App\Models\Contract;
use App\Models\Event;
use App\Models\EventProjection;
use App\Models\EventSnapshot;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class EventReadModelsTest extends TestCase
{
    public function test_application_event_is_persisted_and_projects_read_models(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        $contract = Contract::factory()->create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'assigned_to' => $assignee->id,
            'status' => 'approved',
        ]);

        app(StoreAggregateEvent::class)->handle(
            new ContractUpdated($contract, 'approved', ['status' => 'draft'])
        );

        $event = Event::query()->where('aggregate_type', 'Contract')->first();

        $this->assertNotNull($event);
        $this->assertSame('ContractApproved', $event->event_type);
        $this->assertSame(1, $event->version);
        $this->assertSame('approved', data_get($event->payload, 'attributes.status'));

        $projection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $this->assertNotNull($projection);
        $this->assertSame($event->id, $projection->last_processed_event_id);
        $this->assertSame('ContractApproved', data_get($projection->projection_state, 'last_event_type'));
        $this->assertSame(1, data_get($projection->projection_state, 'dashboard_kpi.contracts_total'));
        $this->assertSame(1, data_get($projection->projection_state, 'dashboard_kpi.contracts_active'));

        $snapshot = EventSnapshot::query()
            ->where('tenant_id', $tenant->id)
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contract->id)
            ->where('version', 1)
            ->first();

        $this->assertNotNull($snapshot);
        $this->assertSame('approved', data_get($snapshot->state, 'status'));
        $this->assertSame('ContractApproved', data_get($snapshot->state, '_meta.event_type'));
    }

    public function test_rebuild_command_backfills_projections_and_snapshots_from_existing_events(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');

        Event::withoutEvents(function () use ($tenant): void {
            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 101,
                'user_id' => null,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-00101',
                        'title' => 'Backfilled contract',
                        'status' => 'draft',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now()->subHour(),
            ]);

            Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => 202,
                'user_id' => null,
                'payload' => [
                    'attributes' => [
                        'incident_number' => 'INC-00202',
                        'title' => 'Backfilled incident',
                        'status' => 'open',
                        'severity' => 'high',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);
        });

        $this->assertDatabaseCount('event_projections', 0);
        $this->assertDatabaseCount('event_snapshots', 0);

        $this->artisan('events:rebuild-read-models')
            ->assertExitCode(0);

        $this->assertDatabaseHas('event_projections', [
            'tenant_id' => $tenant->id,
            'projection_name' => 'contracts_summary',
        ]);
        $this->assertDatabaseHas('event_projections', [
            'tenant_id' => $tenant->id,
            'projection_name' => 'incidents_summary',
        ]);

        $contractsProjection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $incidentsProjection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'incidents_summary')
            ->first();

        $this->assertNotNull($contractsProjection);
        $this->assertNotNull($incidentsProjection);
        $this->assertSame(1, data_get($contractsProjection->projection_state, 'dashboard_kpi.contracts_total'));
        $this->assertSame(1, data_get($incidentsProjection->projection_state, 'dashboard_kpi.incidents_total'));

        $this->assertDatabaseHas('event_snapshots', [
            'tenant_id' => $tenant->id,
            'aggregate_type' => 'Contract',
            'aggregate_id' => 101,
            'version' => 1,
        ]);
        $this->assertDatabaseHas('event_snapshots', [
            'tenant_id' => $tenant->id,
            'aggregate_type' => 'Incident',
            'aggregate_id' => 202,
            'version' => 1,
        ]);
    }
}
