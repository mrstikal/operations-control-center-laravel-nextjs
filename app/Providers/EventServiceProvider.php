<?php

namespace App\Providers;

use App\Events\AlertTriggered;
use App\Events\AssetUpdated;
use App\Events\ContractUpdated;
use App\Events\IncidentUpdated;
use App\Events\NotificationSent;
use App\Listeners\BroadcastAlertTriggered;
use App\Listeners\BroadcastAssetUpdated;
use App\Listeners\BroadcastContractUpdated;
use App\Listeners\BroadcastIncidentUpdated;
use App\Listeners\BroadcastNotificationSent;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        ContractUpdated::class => [
            BroadcastContractUpdated::class,
        ],
        IncidentUpdated::class => [
            BroadcastIncidentUpdated::class,
        ],
        AssetUpdated::class => [
            BroadcastAssetUpdated::class,
        ],
        AlertTriggered::class => [
            BroadcastAlertTriggered::class,
        ],
        NotificationSent::class => [
            BroadcastNotificationSent::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}

