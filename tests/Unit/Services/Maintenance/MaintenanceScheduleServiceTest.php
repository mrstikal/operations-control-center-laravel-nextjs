<?php

namespace Tests\Unit\Services\Maintenance;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Services\Maintenance\MaintenanceScheduleService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MaintenanceScheduleServiceTest extends TestCase
{
    public function test_recalculate_after_maintenance_log_updates_active_schedules_and_asset_next_maintenance(): void
    {
        $asset = Asset::factory()->create([
            'next_maintenance' => now()->addDays(10),
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Weekly check',
            'next_due_date' => now()->addDays(2),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'description' => 'Monthly check',
            'next_due_date' => now()->addDays(20),
            'is_active' => true,
        ]);

        $service = app(MaintenanceScheduleService::class);
        $performedAt = Carbon::parse('2026-03-10 10:00:00');

        $updated = $service->recalculateAfterMaintenanceLog($asset, $performedAt);

        $this->assertSame(2, $updated);

        $asset->refresh();
        $this->assertNotNull($asset->next_maintenance);
        $this->assertTrue($asset->next_maintenance->equalTo($performedAt->copy()->addDays(7)));
    }

    public function test_resolve_interval_days_uses_frequency_defaults(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'quarterly',
            'description' => 'Quarterly task',
            'next_due_date' => now()->addDays(1),
            'is_active' => true,
            'interval_days' => null,
        ]);

        $service = app(MaintenanceScheduleService::class);

        $this->assertSame(90, $service->resolveIntervalDays($schedule));
    }

    // -------------------------------------------------------------------------
    // Phase B part 2 – due_state evaluation
    // -------------------------------------------------------------------------

    public function test_compute_due_state_returns_overdue_when_past_due(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Overdue task',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
        ]);

        $state = app(MaintenanceScheduleService::class)->computeDueState($schedule);

        $this->assertSame(MaintenanceSchedule::DUE_STATE_OVERDUE, $state);
    }

    public function test_compute_due_state_returns_due_soon_within_lookahead(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'description' => 'Due soon task',
            'next_due_date' => now()->addDays(3),
            'is_active' => true,
            'notification_settings' => ['days_before' => 7],
        ]);

        $state = app(MaintenanceScheduleService::class)->computeDueState($schedule);

        $this->assertSame(MaintenanceSchedule::DUE_STATE_DUE_SOON, $state);
    }

    public function test_compute_due_state_returns_ok_when_far_away(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'yearly',
            'description' => 'Far away task',
            'next_due_date' => now()->addDays(90),
            'is_active' => true,
            'notification_settings' => ['days_before' => 7],
        ]);

        $state = app(MaintenanceScheduleService::class)->computeDueState($schedule);

        $this->assertSame(MaintenanceSchedule::DUE_STATE_OK, $state);
    }

    public function test_compute_due_state_returns_ok_for_inactive_schedule(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Inactive overdue',
            'next_due_date' => now()->subDay(),
            'is_active' => false,
        ]);

        $state = app(MaintenanceScheduleService::class)->computeDueState($schedule);

        $this->assertSame(MaintenanceSchedule::DUE_STATE_OK, $state);
    }

    public function test_evaluate_state_transition_returns_transition_on_state_change(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Transition test',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => 'ok',
        ]);

        $service = app(MaintenanceScheduleService::class);
        $result = $service->evaluateStateTransition($schedule);

        $this->assertNotNull($result);
        $this->assertSame('ok', $result['old']);
        $this->assertSame('overdue', $result['new']);
        $this->assertDatabaseHas('maintenance_schedules', [
            'id' => $schedule->id,
            'due_state' => 'overdue',
        ]);
        $this->assertNotNull($schedule->fresh()->last_notified_at);
    }

    public function test_evaluate_state_transition_returns_null_when_no_change_and_recently_notified(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Already notified',
            'next_due_date' => now()->addDays(3),
            'is_active' => true,
            'due_state' => 'due_soon',
            'notification_settings' => ['days_before' => 7],
            'last_notified_at' => now(), // already notified today
        ]);

        $service = app(MaintenanceScheduleService::class);
        $result = $service->evaluateStateTransition($schedule);

        $this->assertNull($result);
    }

    public function test_recalculate_after_maintenance_log_resets_due_state_to_ok(): void
    {
        $asset = Asset::factory()->create();
        $schedule = MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Overdue to reset',
            'next_due_date' => now()->subDays(5),
            'is_active' => true,
            'due_state' => 'overdue',
        ]);

        $service = app(MaintenanceScheduleService::class);
        $service->recalculateAfterMaintenanceLog($asset, now());

        $this->assertDatabaseHas('maintenance_schedules', [
            'id' => $schedule->id,
            'due_state' => 'ok',
        ]);
    }
}
