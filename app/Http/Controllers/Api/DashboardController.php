<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\EventProjection;
use App\Models\EventSnapshot;
use App\Services\Dashboard\DashboardQueryService;
use App\Services\EventStore\EventStoreAvailability;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * DashboardController – thin HTTP adapter for dashboard endpoints.
 *
 * All KPI, monitoring and feed query logic is delegated to
 * {@see DashboardQueryService}.
 */
class DashboardController extends BaseApiController
{
    private const SUMMARY_CACHE_TTL_SECONDS = 20;

    public function __construct(private readonly DashboardQueryService $queryService) {}

    public function summary(): JsonResponse
    {
        $user = $this->prepareDashboardUser(auth()->user());
        $tenantId = $this->resolveDashboardTenantId($user);

        $cacheKey = $this->buildSummaryCacheKey($tenantId, $user);

        $data = Cache::remember($cacheKey, now()->addSeconds(self::SUMMARY_CACHE_TTL_SECONDS), function () use ($tenantId, $user): array {
            $operational = $this->queryService->getOperationalKpi($tenantId, $user);
            $business = $this->queryService->getBusinessKpi($tenantId, $user);
            $roleName = $this->resolveDashboardRoleName($user);

            return [
                'kpi' => [
                    'operational' => $operational,
                    'business' => $business,
                ],
                // Backward-compatible flattened structure expected by legacy tests.
                'kpis' => [
                    'contracts_total' => $business['contracts_total'] ?? 0,
                    'contracts_done' => $business['contracts_done'] ?? 0,
                    'contracts_blocked' => $business['contracts_blocked'] ?? 0,
                    'contracts_in_progress' => $business['contracts_active'] ?? 0,
                    'contracts_sla_breached' => $business['contracts_sla_breached'] ?? 0,
                    'incidents_total' => $operational['incidents_total'] ?? 0,
                    'incidents_open' => ($operational['incidents_open'] ?? 0)
                        + ($operational['incidents_in_progress'] ?? 0)
                        + ($operational['incidents_escalated'] ?? 0),
                    'incidents_escalated' => $operational['incidents_escalated'] ?? 0,
                    'incidents_sla_breached' => $operational['sla_breached'] ?? 0,
                ],
                'summary' => $this->queryService->getQuickSummary($tenantId, $user),
                'monitoring' => $this->queryService->getMonitoringMetrics($tenantId),
                'generated_at' => now()->toIso8601String(),
                'user_role' => $roleName,
            ];
        });

        return $this->success($data, 'Dashboard summary retrieved successfully');
    }

    public function feed(): JsonResponse
    {
        $user = $this->prepareDashboardUser(auth()->user());
        $tenantId = $this->resolveDashboardTenantId($user);
        $limit = request()->query('limit', 20);

        $events = $this->queryService->applyTenantScope(Event::query(), $tenantId)
            ->with(['user:id,name,email']);

        // Role-based event filtering
        if ($user && ! $user->isAdmin()) {
            if ($user->hasRole('Technician')) {
                $events = $events->whereIn('event_type', [
                    'IncidentCreated', 'IncidentUpdated', 'IncidentAssigned',
                    'IncidentEscalated', 'IncidentResolved',
                ]);
            } elseif ($user->hasRole('Manager')) {
                $events = $events->whereIn('event_type', [
                    'ContractStatusChanged', 'ContractApproved',
                    'IncidentCreated', 'IncidentEscalated', 'IncidentResolved',
                ]);
            } elseif ($user->isViewerClient()) {
                $events = $events->whereIn('event_type', [
                    'ContractApproved', 'ContractCompleted',
                ])->where('user_id', $user->id);
            } elseif ($user->isViewerAuditor()) {
                $events = $events->whereIn('event_type', [
                    'ContractApproved', 'ContractCompleted',
                    'IncidentResolved', 'IncidentEscalated',
                ]);
            } elseif ($user->hasRole('Viewer')) {
                $events = $events->whereIn('event_type', [
                    'ContractApproved', 'ContractCompleted', 'IncidentResolved',
                ]);
            }
            // isViewerManagement → no additional filter
        }

        /** @var \Illuminate\Database\Eloquent\Collection<int, Event> $events */
        $events = $events->orderBy('occurred_at', 'desc')->limit($limit)->get();

        $formatted = $events->map(function (Event $event): array {
            return [
                'id' => $event->id,
                'type' => $event->event_type,
                'entity' => $event->aggregate_type,
                'entity_id' => $event->aggregate_id,
                'message' => $this->queryService->formatEventMessage($event),
                'user' => $event->user ? ['id' => $event->user->id, 'name' => $event->user->name] : null,
                'severity' => $this->queryService->getEventSeverity($event),
                'occurred_at' => $event->occurred_at->toIso8601String(),
                'metadata' => $event->metadata,
            ];
        });

        return $this->success([
            'events' => $formatted,
            'total' => $formatted->count(),
        ], 'Dashboard feed retrieved successfully');
    }

    public function readModels(): JsonResponse
    {
        $user = $this->prepareDashboardUser(auth()->user());
        $tenantId = $this->resolveDashboardTenantId($user);
        $tablesAvailable = app(EventStoreAvailability::class)->readModelsAvailable();

        if (! $tablesAvailable) {
            return $this->success([
                'tables_available' => false,
                'projections' => [],
                'snapshots' => [],
                'projections_pagination' => null,
                'snapshots_pagination' => null,
            ], 'Dashboard read models retrieved successfully');
        }

        $projectionPage = max(1, (int) request()->query('projections_page', 1));
        $snapshotPage = max(1, (int) request()->query('snapshots_page', 1));
        $perPage = min(50, max(5, (int) request()->query('per_page', 10)));
        $projectionName = trim((string) request()->query('projection_name', ''));
        $projectionActive = strtolower((string) request()->query('projection_active', 'all'));
        $snapshotAggregateType = trim((string) request()->query('snapshot_aggregate_type', ''));

        $projectionsPaginator = EventProjection::query()
            ->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($projectionName !== '', fn ($q) => $q->where('projection_name', 'like', '%'.$projectionName.'%'))
            ->when($projectionActive === 'active', fn ($q) => $q->where('is_active', true))
            ->when($projectionActive === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderByDesc('updated_at')
            ->paginate($perPage, ['*'], 'projections_page', $projectionPage);

        $projections = collect($projectionsPaginator->items())
            ->map(function (EventProjection $p): array {
                $state = is_array($p->projection_state) ? $p->projection_state : [];

                return [
                    'id' => $p->id,
                    'projection_name' => $p->projection_name,
                    'source_event_type' => $p->source_event_type,
                    'last_processed_event_id' => $p->last_processed_event_id,
                    'last_processed_version' => $p->last_processed_version,
                    'is_active' => $p->is_active,
                    'event_count' => (int) ($state['event_count'] ?? 0),
                    'last_event_type' => $state['last_event_type'] ?? null,
                    'updated_at' => $p->updated_at?->toIso8601String(),
                ];
            })
            ->values();

        $snapshotsPaginator = EventSnapshot::query()
            ->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($snapshotAggregateType !== '', fn ($q) => $q->where('aggregate_type', 'like', '%'.$snapshotAggregateType.'%'))
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'snapshots_page', $snapshotPage);

        $snapshots = collect($snapshotsPaginator->items())
            ->map(fn (EventSnapshot $s): array => [
                'id' => $s->id,
                'aggregate_type' => $s->aggregate_type,
                'aggregate_id' => $s->aggregate_id,
                'version' => $s->version,
                'created_at' => $s->created_at->toIso8601String(),
            ])
            ->values();

        return $this->success([
            'tables_available' => true,
            'projections' => $projections,
            'snapshots' => $snapshots,
            'projections_pagination' => [
                'total' => $projectionsPaginator->total(),
                'per_page' => $projectionsPaginator->perPage(),
                'current_page' => $projectionsPaginator->currentPage(),
                'last_page' => $projectionsPaginator->lastPage(),
            ],
            'snapshots_pagination' => [
                'total' => $snapshotsPaginator->total(),
                'per_page' => $snapshotsPaginator->perPage(),
                'current_page' => $snapshotsPaginator->currentPage(),
                'last_page' => $snapshotsPaginator->lastPage(),
            ],
        ], 'Dashboard read models retrieved successfully');
    }

    // -------------------------------------------------------------------------
    // Private helpers (HTTP / cache / user resolution)
    // -------------------------------------------------------------------------

    private function resolveDashboardRoleName($user = null): string
    {
        if ($user) {
            $name = $user->roles->first()?->getAttribute('name');
            if (is_string($name) && $name !== '') {
                return $name;
            }
        }

        return 'Viewer';
    }

    private function buildSummaryCacheKey(?int $tenantId, $user = null): string
    {
        $tenantSegment = $tenantId === null ? 'all-tenants' : (string) $tenantId;
        $archiveStatus = (string) request('archive_status', 'active');
        $allTenants = request()->boolean('all_tenants') ? '1' : '0';
        $requestedTenant = (string) request('tenant_id', 'none');
        $userId = (string) data_get($user, 'id', 'guest');
        $roleNames = $this->resolveDashboardRoleNames($user);

        return implode(':', [
            'dashboard', 'summary', 'v1',
            'tenant', $tenantSegment,
            'requested', $requestedTenant,
            'all', $allTenants,
            'archive', $archiveStatus,
            'user', $userId,
            'roles', $roleNames,
        ]);
    }

    private function resolveDashboardRoleNames($user = null): string
    {
        if (! $user || ! $user->relationLoaded('roles')) {
            return 'none';
        }

        $roles = $user->roles
            ->map(fn ($role) => (string) $role->getAttribute('name'))
            ->filter(fn (string $name) => $name !== '')
            ->values()
            ->all();

        if ($roles === []) {
            return 'none';
        }

        sort($roles, SORT_STRING);

        return implode(',', $roles);
    }

    private function resolveDashboardTenantId($user = null): ?int
    {
        if (request()->boolean('all_tenants') && $this->canFilterByTenant()) {
            return null;
        }

        if ($this->isGlobalSuperadmin($user) && ! request()->filled('tenant_id')) {
            return null;
        }

        return $this->getTenantId();
    }

    private function isGlobalSuperadmin($user = null): bool
    {
        return $user && $user->isSuperadmin();
    }

    private function prepareDashboardUser($user = null)
    {
        if (! $user) {
            return null;
        }

        $roles = $user->roles()
            ->withoutGlobalScope('tenant')
            ->select('roles.id', 'roles.name', 'roles.level', 'roles.description')
            ->get();
        $user->setRelation('roles', $roles);

        return $user;
    }
}
