<?php

namespace App\Listeners;

use App\Events\NotificationSent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener pro NotificationSent events
 */
class BroadcastNotificationSent implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(NotificationSent $event): void
    {
        // Event je označen jako ShouldBroadcast
        // Laravel automaticky broadcastuje
    }
}

