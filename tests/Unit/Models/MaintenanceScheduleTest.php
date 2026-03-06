<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MaintenanceScheduleTest extends TestCase
{
    /**
     * Test: MaintenanceSchedule belongs to asset
     */
    public function test_maintenance_schedule_belongs_to_asset(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Monthly inspection',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        $this->assertInstanceOf(BelongsTo::class, $schedule->asset());
        $this->assertEquals($asset->id, $schedule->asset->id);
    }

    /**
     * Test: Scope active filters active schedules
     */
    public function test_scope_active_filters_active_schedules(): void
    {
        $asset = Asset::factory()->create();

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Active 1',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Active 2',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'yearly',
            'interval_days' => 365,
            'description' => 'Inactive',
            'next_due_date' => now()->addDays(365),
            'is_active' => false,
        ]);

        $this->assertEquals(2, MaintenanceSchedule::active()->count());
    }

    /**
     * Test: Scope overdue filters overdue schedules
     */
    public function test_scope_overdue_filters_overdue_schedules(): void
    {
        $asset = Asset::factory()->create();

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Overdue',
            'next_due_date' => now()->subDays(5),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Not overdue',
            'next_due_date' => now()->addDays(15),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'yearly',
            'interval_days' => 365,
            'description' => 'Overdue but inactive',
            'next_due_date' => now()->subDays(10),
            'is_active' => false,
        ]);

        $this->assertEquals(1, MaintenanceSchedule::overdue()->count());
    }

    /**
     * Test: Can check if maintenance is overdue
     */
    public function test_can_check_if_maintenance_is_overdue(): void
    {
        $overdueSchedule = MaintenanceSchedule::create([
            'asset_id' => Asset::factory()->create()->id,
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Overdue',
            'next_due_date' => now()->subDays(3),
            'is_active' => true,
        ]);

        $notOverdueSchedule = MaintenanceSchedule::create([
            'asset_id' => Asset::factory()->create()->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Not overdue',
            'next_due_date' => now()->addDays(10),
            'is_active' => true,
        ]);

        $this->assertTrue($overdueSchedule->isOverdue());
        $this->assertFalse($notOverdueSchedule->isOverdue());
    }

    /**
     * Test: Can calculate days until due
     */
    public function test_can_calculate_days_until_due(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => Asset::factory()->create()->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Future maintenance',
            'next_due_date' => now()->addDays(15),
            'is_active' => true,
        ]);

        $days = $schedule->daysUntilDue();

        $this->assertTrue($days >= 14 && $days <= 16);
    }

    /**
     * Test: Datetime field is cast to Carbon
     */
    public function test_datetime_field_is_cast_to_carbon(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => Asset::factory()->create()->id,
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Test schedule',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $this->assertInstanceOf(Carbon::class, $schedule->next_due_date);
    }

    /**
     * Test: Boolean and JSON fields are cast correctly
     */
    public function test_boolean_and_json_fields_are_cast_correctly(): void
    {
        $schedule = MaintenanceSchedule::create([
            'asset_id' => Asset::factory()->create()->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'With notifications',
            'next_due_date' => now()->addDays(30),
            'is_active' => 1,
            'notification_settings' => ['email' => true, 'days_before' => 7],
        ]);

        $this->assertIsBool($schedule->is_active);
        $this->assertTrue($schedule->is_active);
        $this->assertIsArray($schedule->notification_settings);
        $this->assertSame(['email' => true, 'days_before' => 7], $schedule->notification_settings);
    }
}
