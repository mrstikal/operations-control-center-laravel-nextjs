<?php

namespace App\Http\Controllers\Api;

use App\Events\IncidentUpdated;
use App\Http\Requests\StoreIncidentRequest;
use App\Http\Requests\UpdateIncidentRequest;
use App\Http\Resources\IncidentResource;
use App\Models\Incident;
use Illuminate\Http\JsonResponse;

/**
 * IncidentController - REST API pro Incidents
 */
class IncidentController extends BaseApiController
{
    /**
     * GET /api/incidents
     * Vrátí seznam incidentů s paginací
     */
    public function index(): JsonResponse
    {
        $incidents = Incident::ofTenant($this->getTenantId())
            ->with('reportedBy', 'assignedTo', 'contract', 'asset')
            ->when(request('status'), fn($q) => $q->where('status', request('status')))
            ->when(request('severity'), fn($q) => $q->where('severity', request('severity')))
            ->when(request('priority'), fn($q) => $q->where('priority', request('priority')))
            ->when(request('sla_breached'), fn($q) => $q->where('sla_breached', true))
            ->when(request('search'), fn($q) => $q->whereRaw("MATCH(title, description) AGAINST(? IN BOOLEAN MODE)", [request('search')]))
            ->orderBy('reported_at', 'desc')
            ->paginate(request('per_page', 15));

        return $this->paginated($incidents, 'Incidents retrieved successfully');
    }

    /**
     * POST /api/incidents
     * Vytvoří nový incident
     */
    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $this->authorize('create', Incident::class);

        // Generování incident number
        $lastIncident = Incident::ofTenant($this->getTenantId())->latest('id')->first();
        $nextNumber = 'INC-' . str_pad((int)substr($lastIncident?->incident_number ?? 'INC-0', 4) + 1, 6, '0', STR_PAD_LEFT);

        $incident = Incident::create([
            'tenant_id' => $this->getTenantId(),
            'incident_number' => $nextNumber,
            'reported_by' => auth()->id(),
            ...$request->validated(),
            'status' => 'open',
            'reported_at' => now(),
        ]);

        // Broadcast incident created event
        broadcast(new IncidentUpdated($incident, 'created'))->toOthers();

        return $this->created(
            new IncidentResource($incident->load('reportedBy', 'assignedTo', 'contract', 'asset')),
            'Incident created successfully'
        );
    }

    /**
     * GET /api/incidents/{id}
     * Vrátí detail incidentu
     */
    public function show(Incident $incident): JsonResponse
    {
        $this->authorize('view', $incident);

        return $this->success(
            new IncidentResource($incident->load('reportedBy', 'assignedTo', 'escalatedTo', 'contract', 'asset', 'timeline', 'assignments', 'escalations', 'comments')),
            'Incident retrieved successfully'
        );
    }

    /**
     * PUT /api/incidents/{id}
     * Aktualizuje incident
     */
    public function update(UpdateIncidentRequest $request, Incident $incident): JsonResponse
    {
        $this->authorize('update', $incident);

        $oldValues = $incident->only(array_keys($request->validated()));
        $incident->update($request->validated());

        // Broadcast incident updated event
        broadcast(new IncidentUpdated($incident, 'updated', $oldValues))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()),
            'Incident updated successfully'
        );
    }

    /**
     * DELETE /api/incidents/{id}
     * Smaže incident (soft delete)
     */
    public function destroy(Incident $incident): JsonResponse
    {
        $this->authorize('delete', $incident);

        $incident->delete();

        // Broadcast incident deleted event
        broadcast(new IncidentUpdated($incident, 'deleted'))->toOthers();

        return $this->success(null, 'Incident deleted successfully');
    }

    /**
     * POST /api/incidents/{id}/escalate
     * Eskaluje incident
     */
    public function escalate(Incident $incident): JsonResponse
    {
        $this->authorize('escalate', $incident);

        $validated = request()->validate([
            'escalated_to' => 'required|exists:users,id',
            'escalation_level' => 'required|in:level_1,level_2,level_3,level_4',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $escalatedTo = \App\Models\User::find($validated['escalated_to']);
        $incident->escalate(
            auth()->user(),
            $escalatedTo,
            $validated['escalation_level'],
            $validated['reason']
        );

        // Broadcast incident escalated event
        broadcast(new IncidentUpdated($incident, 'escalated', ['escalation_level' => $validated['escalation_level']]))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()),
            'Incident escalated successfully'
        );
    }

    /**
     * POST /api/incidents/{id}/close
     * Uzavře incident
     */
    public function close(Incident $incident): JsonResponse
    {
        $this->authorize('close', $incident);

        $validated = request()->validate([
            'resolution_summary' => 'required|string',
        ]);

        $incident->update([
            'status' => 'closed',
            'closed_at' => now(),
            'resolution_summary' => $validated['resolution_summary'],
        ]);

        // Broadcast incident closed event
        broadcast(new IncidentUpdated($incident, 'closed'))->toOthers();

        return $this->success(
            new IncidentResource($incident->fresh()),
            'Incident closed successfully'
        );
    }
}

