<?php

namespace App\Listeners;

use App\Events\IncidentUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener pro IncidentUpdated events
 */
class BroadcastIncidentUpdated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(IncidentUpdated $event): void
    {
        // Event je označen jako ShouldBroadcast
        // Laravel automaticky broadcastuje
    }
}
