<?php

namespace Tests\Unit\Jobs;

use App\Jobs\DispatchTriggerNotificationsJob;
use App\Jobs\EvaluateMaintenanceSchedulesJob;
use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Models\NotificationSchedule;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EvaluateMaintenanceSchedulesJobTest extends TestCase
{
    public function test_job_syncs_asset_next_maintenance_from_active_schedules(): void
    {
        $asset = Asset::factory()->create([
            'next_maintenance' => now()->addDays(60),
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'interval_days' => 30,
            'description' => 'Monthly task',
            'next_due_date' => now()->addDays(30),
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'interval_days' => 7,
            'description' => 'Weekly task',
            'next_due_date' => now()->addDays(7),
            'is_active' => true,
        ]);

        $job = app(EvaluateMaintenanceSchedulesJob::class);
        $job->handle(app(\App\Services\Maintenance\MaintenanceScheduleService::class));

        $asset->refresh();

        $this->assertNotNull($asset->next_maintenance);
        $this->assertTrue($asset->next_maintenance->isSameDay(now()->addDays(7)));
    }

    public function test_job_dispatches_notification_on_overdue_state_change(): void
    {
        Queue::fake();

        $tenant = Tenant::find(1);
        $asset = Asset::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        // Tenant has an active notification schedule for maintenance_schedule_overdue
        NotificationSchedule::create([
            'tenant_id' => $tenant->id,
            'name' => 'Maintenance overdue alert',
            'notification_type' => 'in_app',
            'trigger' => 'maintenance_schedule_overdue',
            'conditions' => [],
            'recipients' => ['roles' => ['Manager']],
            'is_active' => true,
        ]);

        // Schedule in 'ok' state but now overdue
        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Overdue weekly task',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => 'ok', // transition will fire
        ]);

        $job = app(EvaluateMaintenanceSchedulesJob::class);
        $job->handle(app(\App\Services\Maintenance\MaintenanceScheduleService::class));

        Queue::assertPushed(DispatchTriggerNotificationsJob::class, function ($job) {
            return $job->trigger === 'maintenance_schedule_overdue';
        });
    }

    public function test_job_does_not_dispatch_notification_without_active_notification_schedule(): void
    {
        Queue::fake();

        $asset = Asset::factory()->create(['tenant_id' => 999]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Overdue with no notify config',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => 'ok',
        ]);

        $job = app(EvaluateMaintenanceSchedulesJob::class);
        $job->handle(app(\App\Services\Maintenance\MaintenanceScheduleService::class));

        Queue::assertNotPushed(DispatchTriggerNotificationsJob::class);
    }

    public function test_job_does_not_dispatch_duplicate_notification_when_recently_notified(): void
    {
        Queue::fake();

        $tenant = Tenant::find(1);
        $asset = Asset::factory()->create(['tenant_id' => $tenant->id]);

        NotificationSchedule::create([
            'tenant_id' => $tenant->id,
            'name' => 'Due soon alert',
            'notification_type' => 'in_app',
            'trigger' => 'maintenance_schedule_due',
            'conditions' => [],
            'recipients' => ['roles' => ['Manager']],
            'is_active' => true,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Already notified schedule',
            'next_due_date' => now()->addDays(3),
            'is_active' => true,
            'due_state' => 'due_soon',
            'notification_settings' => ['days_before' => 7],
            'last_notified_at' => now()->subHour(), // notified 1h ago = still in current cycle
        ]);

        $job = app(EvaluateMaintenanceSchedulesJob::class);
        $job->handle(app(\App\Services\Maintenance\MaintenanceScheduleService::class));

        Queue::assertNotPushed(DispatchTriggerNotificationsJob::class);
    }

    public function test_job_records_asset_audit_when_due_state_changes(): void
    {
        $tenant = Tenant::find(1);
        User::factory()->create(['tenant_id' => $tenant->id]);

        $asset = Asset::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'weekly',
            'description' => 'Due state audit case',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => 'ok',
        ]);

        $job = app(EvaluateMaintenanceSchedulesJob::class);
        $job->handle(app(\App\Services\Maintenance\MaintenanceScheduleService::class));

        $this->assertDatabaseHas('asset_audit_trail', [
            'asset_id' => $asset->id,
            'action' => 'maintenance_due_state_changed',
            'reason' => 'system_job',
        ]);
    }
}
