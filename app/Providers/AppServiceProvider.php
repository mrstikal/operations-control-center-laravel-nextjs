<?php

namespace App\Providers;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Event;
use App\Models\Incident;
use App\Observers\AssetObserver;
use App\Observers\ContractObserver;
use App\Observers\EventObserver;
use App\Observers\IncidentObserver;
use App\Services\EventStore\EventStoreAvailability;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // View service je registrován v ViewBootstrapProvider
        $this->app->singleton(EventStoreAvailability::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::observe(EventObserver::class);
        Contract::observe(ContractObserver::class);
        Incident::observe(IncidentObserver::class);
        Asset::observe(AssetObserver::class);
    }
}
