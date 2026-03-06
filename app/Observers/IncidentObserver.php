<?php

namespace App\Observers;

use App\Models\Incident;
use App\Services\Search\SearchIndexerService;

class IncidentObserver
{
    public function saved(Incident $incident): void
    {
        app(SearchIndexerService::class)->indexIncident($incident);
    }

    public function restored(Incident $incident): void
    {
        app(SearchIndexerService::class)->indexIncident($incident);
    }

    public function deleted(Incident $incident): void
    {
        app(SearchIndexerService::class)->remove('incident', (int) $incident->id);
    }

    public function forceDeleted(Incident $incident): void
    {
        app(SearchIndexerService::class)->remove('incident', (int) $incident->id);
    }
}
