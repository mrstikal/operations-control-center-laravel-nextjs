<?php

namespace App\Services\EventStore;

use App\Models\Event;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AggregateEventStore
{
    public function __construct(
        private readonly EventStoreAvailability $availability,
    ) {}

    public function tablesAvailable(): bool
    {
        return $this->availability->eventsTableAvailable();
    }

    public function store(
        string $aggregateType,
        Model $model,
        string $action,
        array $changes = [],
        ?int $userId = null
    ): ?Event {
        if (! $this->tablesAvailable()) {
            return null;
        }

        // Persist only the canonical event row here. Projection/snapshot updates
        // are processed by observer-driven sync or queued flows.
        return DB::transaction(function () use ($aggregateType, $model, $action, $changes, $userId): Event {
            return Event::create([
                'tenant_id' => (int) $model->getAttribute('tenant_id'),
                'event_type' => $this->buildEventType($aggregateType, $action),
                'aggregate_type' => $aggregateType,
                'aggregate_id' => (int) $model->getKey(),
                'user_id' => $userId,
                'payload' => $this->buildPayload($aggregateType, $model, $action, $changes),
                'metadata' => $this->buildMetadata($model, $action),
                'version' => $this->nextVersion($aggregateType, (int) $model->getKey()),
                'occurred_at' => now(),
            ]);
        });
    }

    private function nextVersion(string $aggregateType, int $aggregateId): int
    {
        // lockForUpdate() must be called within the parent DB::transaction() in store().
        // It prevents concurrent requests from reading the same MAX(version) and
        // assigning duplicate version numbers for the same aggregate.
        return (int) Event::query()
            ->where('aggregate_type', $aggregateType)
            ->where('aggregate_id', $aggregateId)
            ->lockForUpdate()
            ->max('version') + 1;
    }

    private function buildEventType(string $aggregateType, string $action): string
    {
        return $aggregateType.Str::of($action)
            ->replace(['-', '_'], ' ')
            ->title()
            ->replace(' ', '');
    }

    private function buildPayload(string $aggregateType, Model $model, string $action, array $changes): array
    {
        return [
            'action' => $action,
            'attributes' => $this->normalizeAttributes($model),
            'changes' => $changes,
            'summary' => $this->buildSummary($aggregateType, $model),
        ];
    }

    private function buildMetadata(Model $model, string $action): array
    {
        return array_filter([
            'source' => 'application_event',
            'model' => class_basename($model),
            'action' => $action,
            'request_path' => app()->runningInConsole() ? null : request()->path(),
        ], static fn ($value) => $value !== null && $value !== '');
    }

    private function normalizeAttributes(Model $model): array
    {
        return Arr::except($model->attributesToArray(), [
            'created_at',
            'updated_at',
            'deleted_at',
        ]);
    }

    private function buildSummary(string $aggregateType, Model $model): array
    {
        return match ($aggregateType) {
            'Contract' => [
                'label' => $model->getAttribute('contract_number') ?? $model->getKey(),
                'title' => $model->getAttribute('title'),
                'status' => $model->getAttribute('status'),
            ],
            'Incident' => [
                'label' => $model->getAttribute('incident_number') ?? $model->getKey(),
                'title' => $model->getAttribute('title'),
                'status' => $model->getAttribute('status'),
                'severity' => $model->getAttribute('severity'),
            ],
            'Asset' => [
                'label' => $model->getAttribute('asset_tag') ?? $model->getKey(),
                'title' => $model->getAttribute('name'),
                'status' => $model->getAttribute('status'),
            ],
            default => [
                'label' => (string) $model->getKey(),
            ],
        };
    }
}
