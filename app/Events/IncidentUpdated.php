<?php

namespace App\Events;

use App\Models\Incident;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Incident $incident;

    public string $action;

    public array $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(Incident $incident, string $action = 'updated', array $changes = [])
    {
        $this->incident = $incident;
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
            new PrivateChannel("tenant.{$this->incident->tenant_id}.incidents"),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'incident_number' => $this->incident->incident_number,
            'title' => $this->incident->title,
            'severity' => $this->incident->severity,
            'status' => $this->incident->status,
            'sla_breached' => $this->incident->sla_breached,
            'action' => $this->action,
            'changes' => $this->changes,
            'updated_at' => $this->incident->updated_at->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'incident.'.$this->action;
    }
}
