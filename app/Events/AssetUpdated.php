<?php

namespace App\Events;

use App\Models\Asset;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AssetUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Asset $asset;
    public string $action;
    public array $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(Asset $asset, string $action = 'updated', array $changes = [])
    {
        $this->asset = $asset;
        $this->action = $action;
        $this->changes = $changes;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tenant.{$this->asset->tenant_id}.assets"),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->asset->id,
            'asset_tag' => $this->asset->asset_tag,
            'name' => $this->asset->name,
            'status' => $this->asset->status,
            'is_due_for_maintenance' => $this->asset->isDueForMaintenance(),
            'action' => $this->action,
            'changes' => $this->changes,
            'updated_at' => $this->asset->updated_at->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'asset.' . $this->action;
    }
}

