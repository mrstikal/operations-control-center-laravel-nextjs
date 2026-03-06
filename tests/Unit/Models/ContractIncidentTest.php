<?php

namespace Tests\Unit\Models;

use App\Models\Contract;
use App\Models\ContractIncident;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ContractIncidentTest extends TestCase
{
    /**
     * Test: ContractIncident belongs to contract
     */
    public function test_contract_incident_belongs_to_contract(): void
    {
        $contract = Contract::factory()->create();
        $incident = ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Test Incident',
            'description' => 'Description',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $incident->contract());
        $this->assertEquals($contract->id, $incident->contract->id);
    }

    /**
     * Test: ContractIncident belongs to reportedBy user
     */
    public function test_contract_incident_belongs_to_reported_by_user(): void
    {
        $reporter = User::factory()->create();
        $incident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Test',
            'description' => 'Test',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => $reporter->id,
            'reported_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $incident->reportedBy());
        $this->assertEquals($reporter->id, $incident->reportedBy->id);
    }

    /**
     * Test: ContractIncident belongs to assignedTo user
     */
    public function test_contract_incident_belongs_to_assigned_to_user(): void
    {
        $assignedUser = User::factory()->create();
        $incident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Test',
            'description' => 'Test',
            'severity' => 'low',
            'status' => 'in_review',
            'reported_by' => User::factory()->create()->id,
            'assigned_to' => $assignedUser->id,
            'reported_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $incident->assignedTo());
        $this->assertEquals($assignedUser->id, $incident->assignedTo->id);
    }

    /**
     * Test: Scope byStatus filters by status
     */
    public function test_scope_by_status_filters_correctly(): void
    {
        $contract = Contract::factory()->create();

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Open 1',
            'description' => 'Test',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Open 2',
            'description' => 'Test',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Resolved',
            'description' => 'Test',
            'severity' => 'low',
            'status' => 'resolved',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $this->assertEquals(2, ContractIncident::byStatus('open')->count());
        $this->assertEquals(1, ContractIncident::byStatus('resolved')->count());
    }

    /**
     * Test: Scope bySeverity filters by severity
     */
    public function test_scope_by_severity_filters_correctly(): void
    {
        $contract = Contract::factory()->create();

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Critical 1',
            'description' => 'Test',
            'severity' => 'critical',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Low 1',
            'description' => 'Test',
            'severity' => 'low',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $this->assertEquals(1, ContractIncident::bySeverity('critical')->count());
        $this->assertEquals(1, ContractIncident::bySeverity('low')->count());
    }

    /**
     * Test: Can check if incident is resolved
     */
    public function test_can_check_if_incident_is_resolved(): void
    {
        $resolvedIncident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Resolved',
            'description' => 'Test',
            'severity' => 'high',
            'status' => 'resolved',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $closedIncident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Closed',
            'description' => 'Test',
            'severity' => 'medium',
            'status' => 'closed',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $openIncident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Open',
            'description' => 'Test',
            'severity' => 'low',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $this->assertTrue($resolvedIncident->isResolved());
        $this->assertTrue($closedIncident->isResolved());
        $this->assertFalse($openIncident->isResolved());
    }

    /**
     * Test: Datetime fields are cast to Carbon
     */
    public function test_datetime_fields_are_cast_to_carbon(): void
    {
        $incident = ContractIncident::create([
            'contract_id' => Contract::factory()->create()->id,
            'title' => 'Test',
            'description' => 'Test',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
            'resolved_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $incident->reported_at);
        $this->assertInstanceOf(Carbon::class, $incident->resolved_at);
    }
}
