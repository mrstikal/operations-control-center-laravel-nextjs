<?php

namespace App\Events;

use App\Models\Contract;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContractUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Contract $contract;
    public string $action;
    public array $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(Contract $contract, string $action = 'updated', array $changes = [])
    {
        $this->contract = $contract;
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
            new PrivateChannel("tenant.{$this->contract->tenant_id}.contracts"),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->contract->id,
            'contract_number' => $this->contract->contract_number,
            'title' => $this->contract->title,
            'status' => $this->contract->status,
            'action' => $this->action,
            'changes' => $this->changes,
            'updated_at' => $this->contract->updated_at->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'contract.' . $this->action;
    }
}

