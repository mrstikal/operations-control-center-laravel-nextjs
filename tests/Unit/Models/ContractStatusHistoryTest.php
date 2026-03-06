<?php

namespace Tests\Unit\Models;

use App\Models\Contract;
use App\Models\ContractStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ContractStatusHistoryTest extends TestCase
{
    /**
     * Test: ContractStatusHistory belongs to contract
     */
    public function test_contract_status_history_belongs_to_contract(): void
    {
        $contract = Contract::factory()->create();
        $user = User::factory()->create();

        $history = ContractStatusHistory::create([
            'contract_id' => $contract->id,
            'old_status' => 'draft',
            'new_status' => 'approved',
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => $user->id,
            'changed_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $history->contract());
        $this->assertEquals($contract->id, $history->contract->id);
    }

    /**
     * Test: ContractStatusHistory belongs to changedBy user
     */
    public function test_contract_status_history_belongs_to_changed_by_user(): void
    {
        $contract = Contract::factory()->create();
        $user = User::factory()->create();

        $history = ContractStatusHistory::create([
            'contract_id' => $contract->id,
            'old_status' => 'draft',
            'new_status' => 'approved',
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => $user->id,
            'changed_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $history->changedBy());
        $this->assertEquals($user->id, $history->changedBy->id);
    }

    /**
     * Test: changed_at field is cast to Carbon
     */
    public function test_changed_at_field_is_cast_to_carbon(): void
    {
        $history = ContractStatusHistory::create([
            'contract_id' => Contract::factory()->create()->id,
            'old_status' => 'draft',
            'new_status' => 'approved',
            'from_status' => 'draft',
            'to_status' => 'approved',
            'changed_by' => User::factory()->create()->id,
            'changed_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $history->changed_at);
    }
}
