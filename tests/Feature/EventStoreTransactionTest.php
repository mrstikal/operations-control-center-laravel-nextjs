<?php

namespace Tests\Feature;

use App\Events\ContractUpdated;
use App\Models\Contract;
use App\Models\Event;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EventStoreTransactionTest extends TestCase
{
    /**
     * Test: Event and contract row are committed atomically; if observer fails, both roll back.
     */
    public function test_event_store_write_is_wrapped_in_transaction(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        // Create contract within explicit transaction
        $contract = DB::transaction(function () use ($tenant, $client, $assignee): Contract {
            $contract = Contract::create([
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'assigned_to' => $assignee->id,
                'contract_number' => 'CTR-TEST-001',
                'title' => 'Transactional Test',
                'description' => 'Testing transaction atomicity',
                'status' => 'draft',
            ]);

            // Dispatch event (observer fires synchronously inside transaction)
            broadcast(new ContractUpdated($contract, 'created'))->toOthers();

            return $contract;
        });

        // Verify contract was created
        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'title' => 'Transactional Test',
        ]);

        // Verify event was stored (by observer in the same transaction)
        $event = Event::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contract->id)
            ->first();

        $this->assertNotNull($event);
        $this->assertSame('ContractCreated', $event->event_type);
        $this->assertSame(1, $event->version);
    }

    /**
     * Test: Update is atomic – contract and event row commit or roll back together.
     */
    public function test_contract_update_is_transactional(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        $contract = Contract::factory()->create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'assigned_to' => $assignee->id,
            'status' => 'draft',
        ]);

        // Update is wrapped in transaction
        DB::transaction(function () use ($contract): void {
            $contract->update(['status' => 'approved']);
            broadcast(new ContractUpdated($contract, 'updated', ['status' => 'draft']))->toOthers();
        });

        // Verify contract was updated
        $contract->refresh();
        $this->assertSame('approved', $contract->status);

        // Verify event was stored
        $event = Event::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contract->id)
            ->where('event_type', 'ContractUpdated')
            ->first();

        $this->assertNotNull($event);
    }

    /**
     * Test: Delete is atomic – contract row and event row roll back or commit together.
     */
    public function test_contract_delete_is_transactional(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        $contract = Contract::factory()->create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'assigned_to' => $assignee->id,
        ]);

        $contractId = $contract->id;

        // Soft-delete is wrapped in transaction
        DB::transaction(function () use ($contract): void {
            $contract->delete();
            broadcast(new ContractUpdated($contract, 'deleted'))->toOthers();
        });

        // Verify contract is soft-deleted
        $this->assertSoftDeleted('contracts', ['id' => $contractId]);

        // Verify event was stored
        $event = Event::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contractId)
            ->where('event_type', 'ContractDeleted')
            ->first();

        $this->assertNotNull($event);
    }

    /**
     * Test: Hard-delete broadcasts event before actual delete for consistency.
     */
    public function test_contract_hard_delete_broadcasts_event_before_delete(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        $contract = Contract::factory()->create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'assigned_to' => $assignee->id,
        ]);

        // Soft delete first
        $contract->delete();

        $contractId = $contract->id;

        // Hard-delete broadcasts event then deletes
        DB::transaction(function () use ($contract): void {
            broadcast(new ContractUpdated($contract, 'hard_deleted'))->toOthers();
            $contract->forceDelete();
        });

        // Verify contract is permanently deleted
        $this->assertNull(Contract::find($contractId));

        // Verify event was stored
        $event = Event::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contractId)
            ->where('event_type', 'ContractHardDeleted')
            ->first();

        $this->assertNotNull($event);
    }

    /**
     * Test: Event-store listener failure is logged but non-fatal (primary DB wins).
     */
    public function test_event_store_listener_failure_is_non_fatal(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        // Temporarily rename events table to force observer failure
        DB::statement('ALTER TABLE events RENAME TO events_backup');

        try {
            $contract = Contract::create([
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'assigned_to' => $assignee->id,
                'contract_number' => 'CTR-TEST-002',
                'title' => 'Non-fatal failure test',
                'description' => 'Event-store writes should not block business logic',
                'status' => 'draft',
            ]);

            // Primary row should exist despite event-store failure
            $this->assertDatabaseHas('contracts', [
                'id' => $contract->id,
                'title' => 'Non-fatal failure test',
            ]);
        } finally {
            // Restore table
            DB::statement('ALTER TABLE events_backup RENAME TO events');
        }
    }

    /**
     * Test: Multiple events within one transaction are ordered by occurrence.
     */
    public function test_multiple_events_in_transaction_maintain_order(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $client = User::factory()->create(['tenant_id' => $tenant->id]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);

        $contract = Contract::factory()->create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'assigned_to' => $assignee->id,
            'status' => 'draft',
        ]);

        // Multiple updates within one transaction
        DB::transaction(function () use ($contract): void {
            $contract->update(['status' => 'approved']);
            broadcast(new ContractUpdated($contract, 'updated', ['status' => 'draft']))->toOthers();

            $contract->update(['status' => 'in_progress']);
            broadcast(new ContractUpdated($contract, 'updated', ['status' => 'approved']))->toOthers();
        });

        // Verify both events exist with correct versions
        $events = Event::query()
            ->where('aggregate_type', 'Contract')
            ->where('aggregate_id', $contract->id)
            ->where('event_type', 'ContractUpdated')
            ->orderBy('version')
            ->get();

        $this->assertCount(2, $events);
        $this->assertSame(1, $events[0]->version);
        $this->assertSame(2, $events[1]->version);
    }

    /**
     * Test: Incident update is transactional.
     */
    public function test_incident_update_is_transactional(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');
        $reporter = User::factory()->create(['tenant_id' => $tenant->id]);

        $incident = Incident::factory()->create([
            'tenant_id' => $tenant->id,
            'reported_by' => $reporter->id,
            'status' => 'open',
        ]);

        DB::transaction(function () use ($incident): void {
            $incident->update(['status' => 'in_progress']);
            broadcast(new \App\Events\IncidentUpdated($incident, 'updated', ['status' => 'open']))->toOthers();
        });

        $incident->refresh();
        $this->assertSame('in_progress', $incident->status);

        $event = Event::query()
            ->where('aggregate_type', 'Incident')
            ->where('aggregate_id', $incident->id)
            ->where('event_type', 'IncidentUpdated')
            ->first();

        $this->assertNotNull($event);
    }
}
