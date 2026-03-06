<?php

namespace Tests\Feature;

use App\Events\ContractUpdated;
use App\Jobs\ProcessEventProjection;
use App\Listeners\StoreAggregateEvent;
use App\Models\Contract;
use App\Models\Event;
use App\Models\EventProjection;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EventStore\EventReadModelService;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EventProjectionDispatchTest extends TestCase
{
    public function test_projection_job_is_dispatched_when_async_mode_is_enabled(): void
    {
        config()->set('event-store.projections.async', true);
        config()->set('event-store.projections.sync_fallback', true);

        Queue::fake();

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
        Queue::assertPushed(ProcessEventProjection::class, function (ProcessEventProjection $job) use ($event): bool {
            return $job->eventId === $event->id;
        });

        $this->assertDatabaseCount('event_projections', 0);
        $this->assertDatabaseCount('event_snapshots', 0);
    }

    public function test_sync_projection_path_remains_active_when_async_mode_is_disabled(): void
    {
        config()->set('event-store.projections.async', false);

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

        $this->assertDatabaseHas('event_projections', [
            'tenant_id' => $tenant->id,
            'projection_name' => 'contracts_summary',
        ]);
        $this->assertDatabaseHas('event_snapshots', [
            'tenant_id' => $tenant->id,
            'aggregate_type' => 'Contract',
            'aggregate_id' => $contract->id,
            'version' => 1,
        ]);
    }

    public function test_projection_job_is_idempotent_for_duplicate_processing(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');

        $event = Event::withoutEvents(function () use ($tenant): Event {
            return Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 4242,
                'user_id' => null,
                'payload' => [
                    'attributes' => [
                        'contract_number' => 'CTR-04242',
                        'title' => 'Idempotent Contract',
                        'status' => 'draft',
                    ],
                ],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);
        });

        $job = new ProcessEventProjection($event->id);
        $service = app(EventReadModelService::class);

        $job->handle($service);
        $job->handle($service);

        $projection = EventProjection::query()
            ->where('tenant_id', $tenant->id)
            ->where('projection_name', 'contracts_summary')
            ->first();

        $this->assertNotNull($projection);
        $this->assertSame(1, data_get($projection->projection_state, 'event_count'));
        $this->assertDatabaseCount('event_snapshots', 1);
        $this->assertDatabaseHas('event_snapshots', [
            'tenant_id' => $tenant->id,
            'aggregate_type' => 'Contract',
            'aggregate_id' => 4242,
            'version' => 1,
        ]);
    }
}
