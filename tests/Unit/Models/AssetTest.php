<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\AssetCategory;
use Tests\TestCase;

class AssetTest extends TestCase
{
    protected AssetCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->category = AssetCategory::factory()->create();
    }

    /**
     * Test: Asset can check if due for maintenance
     */
    public function test_can_check_if_due_for_maintenance(): void
    {
        $overdue = Asset::factory()->create([
            'category_id' => $this->category->id,
            'next_maintenance' => now()->subDays(5),
        ]);

        $notDue = Asset::factory()->create([
            'category_id' => $this->category->id,
            'next_maintenance' => now()->addDays(10),
        ]);

        $this->assertTrue($overdue->isDueForMaintenance());
        $this->assertFalse($notDue->isDueForMaintenance());
    }

    /**
     * Test: Asset can check if warranty expired
     */
    public function test_can_check_if_warranty_expired(): void
    {
        $expired = Asset::factory()->create([
            'category_id' => $this->category->id,
            'warranty_expiry' => now()->subDays(30),
        ]);

        $valid = Asset::factory()->create([
            'category_id' => $this->category->id,
            'warranty_expiry' => now()->addMonths(6),
        ]);

        $this->assertTrue($expired->isWarrantyExpired());
        $this->assertFalse($valid->isWarrantyExpired());
    }

    /**
     * Test: Asset can calculate days until maintenance
     */
    public function test_can_calculate_days_until_maintenance(): void
    {
        $asset = Asset::factory()->create([
            'category_id' => $this->category->id,
            'next_maintenance' => now()->addDays(10),
        ]);

        $days = $asset->daysUntilMaintenance();
        $this->assertTrue($days >= 9 && $days <= 11);
    }

    /**
     * Test: Asset can log maintenance
     */
    public function test_can_log_maintenance(): void
    {
        $asset = Asset::factory()->create(['category_id' => $this->category->id]);
        $user = \App\Models\User::factory()->create();

        $log = $asset->logMaintenance(
            $user,
            'preventive',
            'Oil change',
            ['hours_spent' => 2.5, 'cost' => 150]
        );

        $this->assertEquals('preventive', $log->type);
        $this->assertDatabaseHas('maintenance_logs', [
            'asset_id' => $asset->id,
            'type' => 'preventive',
        ]);
    }
}

