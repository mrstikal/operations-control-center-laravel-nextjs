<?php

namespace App\Observers;

use App\Jobs\ProcessEventProjection;
use App\Models\Event;
use App\Services\EventStore\EventReadModelService;
use Illuminate\Support\Facades\Log;

class EventObserver
{
    public function __construct(
        private readonly EventReadModelService $readModelService,
    ) {}

    public function created(Event $event): void
    {
        if (config('event-store.projections.async')) {
            try {
                ProcessEventProjection::dispatch($event->id);

                return;
            } catch (\Throwable $exception) {
                if (! config('event-store.projections.sync_fallback', true)) {
                    throw $exception;
                }

                Log::warning('Failed to queue event projection job, falling back to synchronous projection.', [
                    'event_id' => $event->id,
                    'event_type' => $event->event_type,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $this->readModelService->projectEvent($event);
    }
}
