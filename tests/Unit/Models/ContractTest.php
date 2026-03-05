<?php

namespace Tests\Unit\Models;

use App\Models\Contract;
use App\Models\User;
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

        $this->assertTrue($overdue->isOverdue());
        $this->assertFalse($notOverdue->isOverdue());
    }

    /**
     * Test: Contract can change status
     */
    public function test_can_change_status(): void
    {
        $contract = Contract::factory()->create(['status' => 'draft']);
        $user = User::factory()->create();

        $contract->changeStatus('approved', $user, 'Approved by manager');

        $this->assertEquals('approved', $contract->status);
        $this->assertDatabaseHas('contract_status_history', [
            'contract_id' => $contract->id,
            'from_status' => 'draft',
            'to_status' => 'approved',
        ]);
    }

    /**
     * Test: Contract has correct scopes
     */
    public function test_contract_scopes(): void
    {
        Contract::factory(2)->create(['tenant_id' => 1, 'status' => 'draft']);
        Contract::factory(3)->create(['tenant_id' => 1, 'status' => 'approved']);

        $this->assertEquals(2, Contract::ofTenant(1)->where('status', 'draft')->count());
        $this->assertEquals(3, Contract::ofTenant(1)->where('status', 'approved')->count());
    }
}

