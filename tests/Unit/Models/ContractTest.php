<?php

namespace Tests\Unit\Models;

use App\Models\Contract;
use App\Models\ContractIncident;
use App\Models\ContractStatusHistory;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ContractTest extends TestCase
{
    /**
     * Test: Contract can calculate remaining budget
     */
    public function test_can_calculate_remaining_budget(): void
    {
        $contract = Contract::factory()->create([
            'budget' => 100000,
            'spent' => 35000,
        ]);

        $this->assertEquals(65000, $contract->getRemainingBudget());
    }

    /**
     * Test: Remaining budget returns null when budget is null
     */
    public function test_remaining_budget_returns_null_when_budget_is_null(): void
    {
        $contract = Contract::factory()->create([
            'budget' => null,
            'spent' => 1000,
        ]);

        $this->assertNull($contract->getRemainingBudget());
    }

    /**
     * Test: Contract can calculate budget usage percent
     */
    public function test_can_calculate_budget_usage_percent(): void
    {
        $contract = Contract::factory()->create([
            'budget' => 100000,
            'spent' => 25000,
        ]);

        $this->assertEquals(25, $contract->getBudgetUsagePercent());
    }

    /**
     * Test: Budget usage returns zero when budget is null
     */
    public function test_budget_usage_returns_zero_when_budget_is_null(): void
    {
        $contract = Contract::factory()->create([
            'budget' => null,
            'spent' => 1000,
        ]);

        $this->assertSame(0.0, $contract->getBudgetUsagePercent());
    }

    /**
     * Test: Contract can check if overdue
     */
    public function test_can_check_if_overdue(): void
    {
        $overdue = Contract::factory()->create([
            'due_date' => now()->subDays(5),
        ]);

        $notOverdue = Contract::factory()->create([
            'due_date' => now()->addDays(10),
        ]);

        $withoutDueDate = Contract::factory()->create([
            'due_date' => null,
        ]);

        $this->assertTrue($overdue->isOverdue());
        $this->assertFalse($notOverdue->isOverdue());
        $this->assertFalse($withoutDueDate->isOverdue());
    }

    /**
     * Test: Contract can change status
     */
    public function test_can_change_status(): void
    {
        $contract = Contract::factory()->create(['status' => 'draft']);
        $user = User::factory()->create();

        $contract->changeStatus('approved', $user, 'Approved by manager');

        $this->assertEquals('approved', $contract->fresh()->status);
        $this->assertDatabaseHas('contract_status_history', [
            'contract_id' => $contract->id,
            'old_status' => 'draft',
            'new_status' => 'approved',
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => $user->id,
            'reason' => 'Approved by manager',
        ]);
        $this->assertNotNull(
            ContractStatusHistory::where('contract_id', $contract->id)->value('changed_at')
        );
    }

    /**
     * Test: Contract has correct scopes
     */
    public function test_contract_scopes(): void
    {
        Contract::factory(2)->create(['tenant_id' => 1, 'status' => 'draft', 'sla_status' => 'breached']);
        Contract::factory(3)->create(['tenant_id' => 1, 'status' => 'approved', 'sla_status' => 'at_risk']);
        Contract::factory()->create(['tenant_id' => 999, 'status' => 'approved', 'sla_status' => 'breached']);

        $this->assertEquals(5, Contract::ofTenant(1)->count());
        $this->assertEquals(3, Contract::byStatus('approved')->where('tenant_id', 1)->count());
        $this->assertEquals(3, Contract::slaBreach()->count());
        $this->assertEquals(3, Contract::atRisk()->where('tenant_id', 1)->count());
    }

    /**
     * Test: Contract relation tenant is BelongsTo
     */
    public function test_contract_has_tenant_relation(): void
    {
        $contract = Contract::factory()->create();

        $this->assertInstanceOf(BelongsTo::class, $contract->tenant());
        $this->assertInstanceOf(Tenant::class, $contract->tenant);
    }

    /**
     * Test: Contract relation assignedTo is BelongsTo via assigned_to
     */
    public function test_contract_has_assigned_to_relation(): void
    {
        $assignedUser = User::factory()->create();
        $contract = Contract::factory()->create(['assigned_to' => $assignedUser->id]);

        $this->assertInstanceOf(BelongsTo::class, $contract->assignedTo());
        $this->assertEquals($assignedUser->id, $contract->assignedTo->id);
    }

    /**
     * Test: Contract relation client is BelongsTo via client_id
     */
    public function test_contract_has_client_relation(): void
    {
        $client = User::factory()->create();
        $contract = Contract::factory()->create(['client_id' => $client->id]);

        $this->assertInstanceOf(BelongsTo::class, $contract->client());
        $this->assertEquals($client->id, $contract->client->id);
    }

    /**
     * Test: Contract incidents relation is HasMany
     */
    public function test_contract_has_incidents_relation(): void
    {
        $contract = Contract::factory()->create();

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Incident A',
            'description' => 'First incident',
            'severity' => 'high',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => 'Incident B',
            'description' => 'Second incident',
            'severity' => 'medium',
            'status' => 'open',
            'reported_by' => User::factory()->create()->id,
            'reported_at' => now(),
        ]);

        $this->assertInstanceOf(HasMany::class, $contract->incidents());
        $this->assertCount(2, $contract->incidents);
    }

    /**
     * Test: Status history relation is ordered by changed_at desc
     */
    public function test_status_history_relation_is_ordered_desc(): void
    {
        $contract = Contract::factory()->create();
        $user = User::factory()->create();

        ContractStatusHistory::create([
            'contract_id' => $contract->id,
            'old_status' => 'draft',
            'new_status' => 'approved',
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => $user->id,
            'changed_at' => now()->subDay(),
        ]);

        ContractStatusHistory::create([
            'contract_id' => $contract->id,
            'old_status' => 'approved',
            'new_status' => 'in_progress',
            'from_status' => 'approved',
            'to_status' => 'in_progress',
            'changed_by' => $user->id,
            'changed_at' => now(),
        ]);

        $history = $contract->statusHistory()->get();

        $this->assertCount(2, $history);
        $this->assertEquals('in_progress', $history->first()->to_status);
    }

    /**
     * Test: Contract date fields are cast to Carbon
     */
    public function test_contract_datetime_fields_are_cast_to_carbon(): void
    {
        $contract = Contract::factory()->create();

        $this->assertInstanceOf(Carbon::class, $contract->start_date);
        $this->assertInstanceOf(Carbon::class, $contract->due_date);
        $this->assertInstanceOf(Carbon::class, $contract->sla_deadline);
    }

    /**
     * Test: Contract decimal and json casts work correctly
     */
    public function test_contract_decimal_and_json_casts_work(): void
    {
        $contract = Contract::factory()->create([
            'budget' => 1234.5,
            'spent' => 12,
            'tags' => ['vip', 'yearly'],
            'custom_fields' => ['owner' => 'ops'],
        ]);

        $this->assertSame('1234.50', $contract->budget);
        $this->assertSame('12.00', $contract->spent);
        $this->assertIsArray($contract->tags);
        $this->assertIsArray($contract->custom_fields);
        $this->assertSame(['vip', 'yearly'], $contract->tags);
        $this->assertSame(['owner' => 'ops'], $contract->custom_fields);
    }
}
