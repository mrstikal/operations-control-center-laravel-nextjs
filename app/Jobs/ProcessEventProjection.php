<?php

namespace App\Jobs;

use App\Models\Event;
use App\Services\EventStore\EventReadModelService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessEventProjection implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $eventId)
    {
        $this->afterCommit();

        $connection = config('event-store.projections.connection');
        if (is_string($connection) && $connection !== '') {
            $this->onConnection($connection);
        }

        $this->onQueue((string) config('event-store.projections.queue', 'event-projections'));
    }

    public function handle(EventReadModelService $readModelService): void
    {
        $event = Event::query()->find($this->eventId);

        if (! $event) {
            return;
        }

        $readModelService->projectEvent($event);
    }
}
