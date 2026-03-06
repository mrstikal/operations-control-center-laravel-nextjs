<?php

namespace App\Listeners;

use App\Events\AssetUpdated;
use App\Events\ContractUpdated;
use App\Events\IncidentUpdated;
use App\Services\EventStore\AggregateEventStore;
use Illuminate\Support\Facades\Log;

class StoreAggregateEvent
{
    public function __construct(
        private readonly AggregateEventStore $eventStore,
    ) {}

    public function handle(object $event): void
    {
        try {
            match (true) {
                $event instanceof ContractUpdated => $this->eventStore->store(
                    'Contract',
                    $event->contract,
                    $event->action,
                    $event->changes,
                    auth()->id()
                ),
                $event instanceof IncidentUpdated => $this->eventStore->store(
                    'Incident',
                    $event->incident,
                    $event->action,
                    $event->changes,
                    auth()->id()
                ),
                $event instanceof AssetUpdated => $this->eventStore->store(
                    'Asset',
                    $event->asset,
                    $event->action,
                    $event->changes,
                    auth()->id()
                ),
                default => null,
            };
        } catch (\Throwable $e) {
            // Event-store write is non-fatal: primary business data is the source
            // of truth. Projections can be rebuilt via `php artisan events:rebuild-read-models`.
            Log::error('Event-store write failed – projection may be out of sync', [
                'event_class' => get_class($event),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
