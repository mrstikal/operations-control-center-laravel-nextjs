<?php

namespace App\Listeners;

use App\Events\AlertTriggered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener pro AlertTriggered events
 */
class BroadcastAlertTriggered implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(AlertTriggered $event): void
    {
        // Event je označen jako ShouldBroadcast
        // Laravel automaticky broadcastuje
    }
}

