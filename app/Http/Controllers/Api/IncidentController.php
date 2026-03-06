<?php

namespace App\Http\Controllers\Api;

use App\Events\IncidentUpdated;
use App\Http\Requests\CloseIncidentRequest;
use App\Http\Requests\EscalateIncidentRequest;
use App\Http\Requests\StoreIncidentRequest;
use App\Http\Requests\UpdateIncidentRequest;
use App\Http\Resources\IncidentResource;
use App\Models\Incident;
use App\Services\Incidents\IncidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * IncidentController - REST API for Incidents.
 *
 * Business logic (unique-number allocation, escalation, close) is delegated
 * to {@see IncidentService}.
 */
class IncidentController extends BaseApiController
{
    public function __construct(private readonly IncidentService $incidentService) {}

    /**
     * GET /api/incidents
     * List incidents with pagination.
     */
    public function index(): JsonResponse
    {
        $driver = DB::connection()->getDriverName();
        $tenantId = $this->getOptionalTenantId();
        $status = request('status');
        $search = request('search');

        // Parse sort parameter
        $sortRaw = (string) request('sort', '');
        [$sortKey, $sortDirectionRaw] = array_pad(explode(':', $sortRaw, 2), 2, 'asc');
        $sortDirection = strtolower($sortDirectionRaw) === 'desc' ? 'desc' : 'asc';

        $query = Incident::query();

        if ($tenantId !== null) {
            $query->ofTenant($tenantId);
        }

        $incidents = $query
            ->with([
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at',
            ])
            ->filterStatus($status)
            ->filterSeverity(request('severity'))
            ->filterPriority(request('priority'))
            ->filterSlaBreached(request('sla_breached'))
            ->search($search, $driver)
            ->sortForIndex($sortKey, $sortDirection);

        $incidents = $incidents->paginate(request('per_page', 15));

        return $this->paginated($incidents, 'Incidents retrieved successfully');
    }

    /**
     * POST /api/incidents
     * Create a new incident.
     */
    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $this->authorize('create', Incident::class);

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create incidents for archived tenant', 422);
        }

        $validated = $request->validated();
        $incident = $this->incidentService->createWithUniqueNumber($tenantId, $validated, auth()->user());

        // Broadcast incident created event
        broadcast(new IncidentUpdated($incident, 'created'))->toOthers();

        return $this->created(
            new IncidentResource($incident->fresh()->load(
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at'
            )),
            'Incident created successfully'
        );
    }

    /**
     * GET /api/incidents/{id}
     * Returns incident details.
     */
    public function show(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->with([
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'escalatedTo:id,name',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name',
            ])
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        return $this->success(
            new IncidentResource($incident),
            'Incident retrieved successfully'
        );
    }

    /**
     * PUT /api/incidents/{id}
     * Updates an incident.
     */
    public function update(UpdateIncidentRequest $request, Incident $incident): JsonResponse
    {
        $this->authorize('update', $incident);

        $validated = $request->validated();
        $targetTenantId = (int) ($validated['tenant_id'] ?? $incident->tenant_id);
        $this->assertWritableTenant($targetTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot update incidents for archived tenant', 422);
        }

        $oldStatus = $incident->status;
        $newStatus = $validated['status'] ?? $oldStatus;
        $statusChanging = array_key_exists('status', $validated) && $newStatus !== $oldStatus;

        $oldValues = $incident->only(array_keys($validated));

        DB::transaction(function () use ($incident, $validated, $oldStatus, $newStatus, $statusChanging): void {
            $incident->update($validated);

            if ($statusChanging) {
                $incident->addTimelineEvent(
                    auth()->user(),
                    'status_changed',
                    "Status changed from {$oldStatus} to {$newStatus}",
                    ['old_status' => $oldStatus, 'new_status' => $newStatus]
                );
            }
        });

        broadcast(new IncidentUpdated($incident, 'updated', $oldValues))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()->load(
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'escalatedTo:id,name',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at'
            )),
            'Incident updated successfully'
        );
    }

    /**
     * DELETE /api/incidents/{id}
     * Deletes an incident (soft delete).
     */
    public function destroy(Incident $incident): JsonResponse
    {
        $this->authorize('delete', $incident);
        $this->assertWritableTenant((int) $incident->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($incident->tenant_id)) {
            return $this->error('Cannot delete incidents for archived tenant', 422);
        }

        DB::transaction(function () use ($incident): void {
            $incident->delete();
        });

        broadcast(new IncidentUpdated($incident, 'deleted'))->toOthers();

        return $this->success(null, 'Incident deleted successfully');
    }

    /**
     * DELETE /api/incidents/{id}/hard-delete
     * Permanently deletes an incident (hard delete).
     */
    public function hardDelete(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('forceDelete', $incident);
        $this->assertWritableTenant((int) $incident->tenant_id);

        if (! $incident->trashed()) {
            return $this->error('Hard delete is allowed only after soft delete', 422);
        }

        DB::transaction(function () use ($incident): void {
            $incident->forceDelete();
        });

        broadcast(new IncidentUpdated($incident, 'hard_deleted'))->toOthers();

        return $this->success(null, 'Incident permanently deleted successfully');
    }

    /**
     * POST /api/incidents/{id}/restore
     * Restores a soft-deleted incident.
     */
    public function restore(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('restore', $incident);
        $this->assertWritableTenant((int) $incident->tenant_id);

        if (! $incident->trashed()) {
            return $this->error('Restore is allowed only for soft-deleted incidents', 422);
        }

        DB::transaction(function () use ($incident): void {
            $incident->restore();
        });

        broadcast(new IncidentUpdated($incident, 'restored'))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()->load(
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'escalatedTo:id,name',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at'
            )),
            'Incident restored successfully'
        );
    }

    /**
     * POST /api/incidents/{id}/escalate
     * Escalates an incident.
     */
    public function escalate(EscalateIncidentRequest $request, Incident $incident): JsonResponse
    {
        $this->authorize('escalate', $incident);
        $this->assertWritableTenant((int) $incident->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($incident->tenant_id)) {
            return $this->error('Cannot escalate incidents for archived tenant', 422);
        }

        $validated = $request->validated();

        $this->incidentService->escalate($incident, $validated, auth()->user());

        broadcast(new IncidentUpdated($incident, 'escalated', ['escalation_level' => $validated['escalation_level']]))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()->load(
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'escalatedTo:id,name',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at'
            )),
            'Incident escalated successfully'
        );
    }

    /**
     * POST /api/incidents/{id}/close
     * Closes an incident.
     */
    public function close(CloseIncidentRequest $request, Incident $incident): JsonResponse
    {
        $this->authorize('close', $incident);
        $this->assertWritableTenant((int) $incident->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($incident->tenant_id)) {
            return $this->error('Cannot close incidents for archived tenant', 422);
        }

        $validated = $request->validated();

        $this->incidentService->close($incident, $validated, auth()->user());

        broadcast(new IncidentUpdated($incident, 'closed'))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()->load(
                'reportedBy:id,name,email',
                'assignedTo:id,name,email',
                'escalatedTo:id,name',
                'contract:id,contract_number,title',
                'asset:id,asset_tag,name',
                'tenant:id,name,deleted_at'
            )),
            'Incident closed successfully'
        );
    }

    /**
     * GET /api/incidents/{id}/timeline
     * Returns incident timeline.
     */
    public function timeline(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        $events = $incident->timeline()->with('user:id,name')->get();

        return $this->success(
            $events->map(function ($event) {
                return [
                    'id' => $event->id,
                    'event_type' => $event->event_type,
                    'message' => $event->message,
                    'user' => $event->user ? [
                        'id' => data_get($event, 'user.id'),
                        'name' => data_get($event, 'user.name'),
                    ] : null,
                    'occurred_at' => $event->occurred_at->toIso8601String(),
                    'metadata' => $event->metadata,
                ];
            }),
            'Timeline retrieved successfully'
        );
    }

    /**
     * GET /api/incidents/{id}/assignments
     * Returns incident assignments.
     */
    public function assignments(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        $assignments = $incident->assignments()->with('user:id,name')->get();

        return $this->success(
            $assignments->map(function ($a) {
                return [
                    'id' => $a->id,
                    'user' => [
                        'id' => data_get($a, 'user.id'),
                        'name' => data_get($a, 'user.name'),
                    ],
                    'role' => $a->role,
                    'assigned_at' => $a->assigned_at->toIso8601String(),
                    'unassigned_at' => $a->unassigned_at?->toIso8601String(),
                ];
            }),
            'Assignments retrieved successfully'
        );
    }

    /**
     * GET /api/incidents/{id}/escalations
     * Returns escalation history.
     */
    public function escalations(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        $escalations = $incident->escalations()->with(['escalatedBy:id,name', 'escalatedTo:id,name'])->get();

        return $this->success(
            $escalations->map(function ($e) {
                return [
                    'id' => $e->id,
                    'escalated_by' => [
                        'id' => data_get($e, 'escalatedBy.id'),
                        'name' => data_get($e, 'escalatedBy.name'),
                    ],
                    'escalated_to' => [
                        'id' => data_get($e, 'escalatedTo.id'),
                        'name' => data_get($e, 'escalatedTo.name'),
                    ],
                    'escalation_level' => $e->escalation_level,
                    'reason' => $e->reason,
                    'notes' => $e->notes,
                    'escalated_at' => $e->escalated_at->toIso8601String(),
                    'resolved_at' => $e->resolved_at?->toIso8601String(),
                ];
            }),
            'Escalations retrieved successfully'
        );
    }

    /**
     * GET /api/incidents/{id}/comments
     * Returns incident comments.
     */
    public function comments(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        $comments = $incident->comments()->with('user:id,name')->get();

        return $this->success(
            $comments->map(function ($c) {
                return [
                    'id' => $c->id,
                    'user' => [
                        'id' => data_get($c, 'user.id'),
                        'name' => data_get($c, 'user.name'),
                    ],
                    'comment' => $c->comment,
                    'is_internal' => $c->is_internal,
                    'commented_at' => $c->commented_at->toIso8601String(),
                ];
            }),
            'Comments retrieved successfully'
        );
    }

    /**
     * POST /api/incidents/{id}/comments
     * Adds a comment to an incident.
     */
    public function addComment(int $incidentId): JsonResponse
    {
        $incident = Incident::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($incidentId);

        if (! $incident) {
            return $this->notFound('Incident not found');
        }

        $this->authorize('view', $incident);

        $validated = request()->validate([
            'comment' => 'required|string|min:1',
            'is_internal' => 'nullable|boolean',
        ]);

        $comment = $incident->addComment(
            auth()->user(),
            $validated['comment'],
            $validated['is_internal'] ?? false
        );

        return $this->created([
            'id' => $comment->id,
            'comment' => $comment->comment,
            'commented_at' => $comment->commented_at->toIso8601String(),
        ], 'Comment added successfully');
    }
}
