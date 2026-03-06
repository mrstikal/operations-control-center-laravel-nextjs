<?php

namespace App\Services\EventStore;

use App\Models\Event;
use App\Models\EventProjection;
use App\Models\EventSnapshot;
use Illuminate\Support\Carbon;
use Illuminate\Support\LazyCollection;
use Illuminate\Support\Str;

class EventReadModelService
{
    public function __construct(
        private readonly EventStoreAvailability $availability,
    ) {}

    public function tablesAvailable(): bool
    {
        return $this->availability->readModelsAvailable();
    }

    public function projectEvent(Event $event): void
    {
        if (! $this->tablesAvailable()) {
            return;
        }

        $this->updateProjection($event);
        $this->storeSnapshot($event);
    }

    public function rebuild(?int $tenantId = null): array
    {
        if (! $this->tablesAvailable()) {
            return [
                'events' => 0,
                'projections' => 0,
                'snapshots' => 0,
            ];
        }

        $this->resetProjections($tenantId);
        $this->resetSnapshots($tenantId);

        $processedEvents = 0;
        foreach ($this->eventsForRebuild($tenantId) as $event) {
            $this->updateProjection($event);
            $this->storeSnapshot($event);
            $processedEvents++;
        }

        return [
            'events' => $processedEvents,
            'projections' => EventProjection::query()
                ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
                ->count(),
            'snapshots' => EventSnapshot::query()
                ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
                ->count(),
        ];
    }

    public function rebuildProjections(?int $tenantId = null): int
    {
        if (! $this->availability->projectionsTableAvailable()) {
            return 0;
        }

        $this->resetProjections($tenantId);

        $processedEvents = 0;
        foreach ($this->eventsForRebuild($tenantId) as $event) {
            $this->updateProjection($event);
            $processedEvents++;
        }

        return $processedEvents;
    }

    public function rebuildSnapshots(?int $tenantId = null): int
    {
        if (! $this->availability->snapshotsTableAvailable()) {
            return 0;
        }

        $this->resetSnapshots($tenantId);

        $processedEvents = 0;
        foreach ($this->eventsForRebuild($tenantId) as $event) {
            $this->storeSnapshot($event);
            $processedEvents++;
        }

        return $processedEvents;
    }

    private function updateProjection(Event $event): void
    {
        $projection = EventProjection::firstOrNew([
            'tenant_id' => $event->tenant_id,
            'projection_name' => $this->projectionNameFor($event),
        ]);

        if ($projection->exists && (int) $projection->last_processed_event_id >= (int) $event->id) {
            return;
        }

        $state = is_array($projection->projection_state) ? $projection->projection_state : [];
        $eventCounts = is_array($state['events_by_type'] ?? null) ? $state['events_by_type'] : [];
        $eventCounts[$event->event_type] = ($eventCounts[$event->event_type] ?? 0) + 1;

        $recentAggregateIds = array_values(array_unique(array_merge(
            [$event->aggregate_id],
            is_array($state['recent_aggregate_ids'] ?? null) ? $state['recent_aggregate_ids'] : []
        )));

        $state = [
            ...$state,
            'aggregate_type' => $event->aggregate_type,
            'event_count' => (int) ($state['event_count'] ?? 0) + 1,
            'events_by_type' => $eventCounts,
            'last_event_id' => $event->id,
            'last_event_type' => $event->event_type,
            'last_occurred_at' => $event->occurred_at->toIso8601String(),
            'recent_aggregate_ids' => array_slice($recentAggregateIds, 0, 25),
        ];

        $state = $this->applyDashboardState($state, $event);

        $projection->fill([
            'source_event_type' => $event->event_type,
            'last_processed_event_id' => $event->id,
            'last_processed_version' => $event->version,
            'projection_state' => $state,
            'is_active' => true,
        ]);

        $projection->save();
    }

    private function storeSnapshot(Event $event): void
    {
        $existingSnapshot = EventSnapshot::query()
            ->forAggregate($event->aggregate_type, $event->aggregate_id)
            ->latest('version')
            ->first();

        $state = is_array($existingSnapshot?->state) ? $existingSnapshot->state : [];
        $payload = $event->payload;

        if (is_array($payload['attributes'] ?? null)) {
            $state = array_replace_recursive($state, $payload['attributes']);
        } else {
            $state = array_replace_recursive($state, $payload);
        }

        $state['_meta'] = [
            'event_id' => $event->id,
            'event_type' => $event->event_type,
            'version' => $event->version,
            'occurred_at' => $event->occurred_at->toIso8601String(),
        ];

        EventSnapshot::firstOrCreate(
            [
                'tenant_id' => $event->tenant_id,
                'aggregate_type' => $event->aggregate_type,
                'aggregate_id' => $event->aggregate_id,
                'version' => $event->version,
            ],
            [
                'state' => $state,
                'created_at' => $event->occurred_at ?? now(),
            ]
        );
    }

    private function resetProjections(?int $tenantId = null): void
    {
        EventProjection::query()
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->delete();
    }

    private function resetSnapshots(?int $tenantId = null): void
    {
        EventSnapshot::query()
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->delete();
    }

    /**
     * Stream events in deterministic order to avoid loading full history into memory.
     *
     * @return LazyCollection<int, Event>
     */
    private function eventsForRebuild(?int $tenantId = null): LazyCollection
    {
        return Event::query()
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->orderBy('id')
            ->lazyById(500, 'id');
    }

    private function projectionNameFor(Event $event): string
    {
        return Str::snake(Str::pluralStudly($event->aggregate_type)).'_summary';
    }

    private function applyDashboardState(array $state, Event $event): array
    {
        $aggregates = is_array($state['aggregates'] ?? null) ? $state['aggregates'] : [];
        $aggregateKey = (string) $event->aggregate_id;

        $payload = $event->payload;
        $attributes = is_array($payload['attributes'] ?? null)
            ? $payload['attributes']
            : $payload;

        $current = is_array($aggregates[$aggregateKey] ?? null) ? $aggregates[$aggregateKey] : [];
        $action = (string) ($payload['action'] ?? '');

        $shouldDelete = in_array($action, ['deleted', 'hard_deleted'], true);
        $wasRestored = $action === 'restored';

        if ($shouldDelete) {
            $current['deleted'] = true;
        } elseif ($wasRestored) {
            $current['deleted'] = false;
        }

        if ($event->aggregate_type === 'Contract') {
            $current = [
                ...$current,
                'status' => $attributes['status'] ?? ($current['status'] ?? null),
                'sla_status' => $attributes['sla_status'] ?? ($current['sla_status'] ?? null),
                'budget' => isset($attributes['budget']) ? (float) $attributes['budget'] : ($current['budget'] ?? 0.0),
                'spent' => isset($attributes['spent']) ? (float) $attributes['spent'] : ($current['spent'] ?? 0.0),
                'due_date' => $attributes['due_date'] ?? ($current['due_date'] ?? null),
                'deleted' => (bool) ($current['deleted'] ?? false),
            ];
        }

        if ($event->aggregate_type === 'Incident') {
            $current = [
                ...$current,
                'status' => $attributes['status'] ?? ($current['status'] ?? null),
                'severity' => $attributes['severity'] ?? ($current['severity'] ?? null),
                'resolved_at' => $attributes['resolved_at'] ?? ($current['resolved_at'] ?? null),
                'sla_breached' => (bool) ($attributes['sla_breached'] ?? ($current['sla_breached'] ?? false)),
                'deleted' => (bool) ($current['deleted'] ?? false),
            ];
        }

        if ($event->aggregate_type === 'Asset') {
            $current = [
                ...$current,
                'status' => $attributes['status'] ?? ($current['status'] ?? null),
                'deleted' => (bool) ($current['deleted'] ?? false),
            ];
        }

        $aggregates[$aggregateKey] = $current;

        $state['aggregates'] = $aggregates;
        $state['dashboard_kpi'] = $this->calculateDashboardKpi($event->aggregate_type, $aggregates);

        return $state;
    }

    private function calculateDashboardKpi(string $aggregateType, array $aggregates): array
    {
        $items = collect($aggregates)
            ->filter(fn ($item) => is_array($item) && ! (bool) ($item['deleted'] ?? false))
            ->values();

        if ($aggregateType === 'Contract') {
            $active = $items->filter(fn ($item) => in_array($item['status'] ?? null, ['approved', 'in_progress'], true));
            $done = $items->filter(fn ($item) => ($item['status'] ?? null) === 'done');
            $now = now();

            return [
                'contracts_total' => $items->count(),
                'contracts_active' => $active->count(),
                'contracts_pending' => $items->where('status', 'draft')->count(),
                'contracts_done' => $done->count(),
                'contracts_blocked' => $items->where('status', 'blocked')->count(),
                'contracts_sla_breached' => $items->where('sla_status', 'breached')->count(),
                'contracts_expiring_30_days' => $active->filter(function ($item) use ($now) {
                    $dueDate = $item['due_date'] ?? null;
                    if (! is_string($dueDate) || $dueDate === '') {
                        return false;
                    }

                    $parsed = Carbon::parse($dueDate);

                    return $parsed->betweenIncluded($now, $now->copy()->addDays(30));
                })->count(),
                'contracts_overdue' => $active->filter(function ($item) use ($now) {
                    $dueDate = $item['due_date'] ?? null;
                    if (! is_string($dueDate) || $dueDate === '') {
                        return false;
                    }

                    return Carbon::parse($dueDate)->lt($now);
                })->count(),
                'total_budget' => round((float) $active->sum(fn ($item) => (float) ($item['budget'] ?? 0.0)), 2),
                'total_spent' => round((float) $done->sum(fn ($item) => (float) ($item['spent'] ?? 0.0)), 2),
            ];
        }

        if ($aggregateType === 'Incident') {
            return [
                'incidents_total' => $items->count(),
                'incidents_open' => $items->where('status', 'open')->count(),
                'incidents_in_progress' => $items->where('status', 'in_progress')->count(),
                'incidents_escalated' => $items->where('status', 'escalated')->count(),
                'incidents_resolved_today' => $items->filter(function ($item) {
                    if (($item['status'] ?? null) !== 'resolved') {
                        return false;
                    }

                    $resolvedAt = $item['resolved_at'] ?? null;
                    if (! is_string($resolvedAt) || $resolvedAt === '') {
                        return false;
                    }

                    return Carbon::parse($resolvedAt)->isToday();
                })->count(),
                'sla_breached' => $items->filter(fn ($item) => (bool) ($item['sla_breached'] ?? false))->count(),
            ];
        }

        if ($aggregateType === 'Asset') {
            return [
                'assets_total' => $items->count(),
                'assets_operational' => $items->where('status', 'operational')->count(),
                'assets_maintenance' => $items->where('status', 'maintenance')->count(),
            ];
        }

        return [];
    }
}
