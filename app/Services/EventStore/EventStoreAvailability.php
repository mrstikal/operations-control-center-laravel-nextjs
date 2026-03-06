<?php

namespace App\Services\EventStore;

use Illuminate\Support\Facades\Schema;

class EventStoreAvailability
{
    private ?bool $eventsTableAvailable = null;

    private ?bool $projectionsTableAvailable = null;

    private ?bool $snapshotsTableAvailable = null;

    public function eventsTableAvailable(): bool
    {
        return $this->eventsTableAvailable ??= Schema::hasTable('events');
    }

    public function projectionsTableAvailable(): bool
    {
        return $this->projectionsTableAvailable ??= $this->eventsTableAvailable()
            && Schema::hasTable('event_projections');
    }

    public function snapshotsTableAvailable(): bool
    {
        return $this->snapshotsTableAvailable ??= $this->eventsTableAvailable()
            && Schema::hasTable('event_snapshots');
    }

    public function readModelsAvailable(): bool
    {
        return $this->projectionsTableAvailable() && $this->snapshotsTableAvailable();
    }
}
