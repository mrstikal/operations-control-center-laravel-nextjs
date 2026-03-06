<?php

namespace App\Listeners;

use App\Events\ContractUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener pro ContractUpdated events
 * Dispatchuje event do Broadcasting systému
 */
class BroadcastContractUpdated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(ContractUpdated $event): void
    {
        // Event je označen jako ShouldBroadcast
        // Laravel automaticky broadcastuje
    }
}
