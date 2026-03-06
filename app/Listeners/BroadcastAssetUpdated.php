<?php

namespace App\Listeners;

use App\Events\AssetUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener pro AssetUpdated events
 */
class BroadcastAssetUpdated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(AssetUpdated $event): void
    {
        // Event je označen jako ShouldBroadcast
        // Laravel automaticky broadcastuje
    }
}
