<?php

use App\Jobs\EvaluateMaintenanceSchedulesJob;
use App\Jobs\EvaluateScheduledTriggersJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Jobs
|--------------------------------------------------------------------------
|
| Notification evaluation runs every 5 minutes.
| The job only processes tenants that have at least one active schedule
| for the relevant trigger, so it is safe to run frequently.
|
*/

Schedule::job(new EvaluateMaintenanceSchedulesJob)
    ->everyFiveMinutes()
    ->name('evaluate-maintenance-schedules')
    ->withoutOverlapping(10)
    ->onFailure(function () {
        \Illuminate\Support\Facades\Log::error('Scheduler: EvaluateMaintenanceSchedulesJob failed.');
    });

Schedule::job(new EvaluateScheduledTriggersJob)
    ->everyFiveMinutes()
    ->name('evaluate-scheduled-triggers')
    ->withoutOverlapping(10)
    ->onFailure(function () {
        \Illuminate\Support\Facades\Log::error('Scheduler: EvaluateScheduledTriggersJob failed.');
    });
