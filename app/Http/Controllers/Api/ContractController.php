<?php

namespace App\Http\Controllers\Api;

use App\Events\ContractUpdated;
use App\Http\Requests\ChangeContractStatusRequest;
use App\Http\Requests\StoreContractIncidentRequest;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\UpdateContractRequest;
use App\Http\Resources\ContractResource;
use App\Models\Contract;
use App\Models\ContractIncident;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ContractController extends BaseApiController
{
    public function index(): JsonResponse
    {
        $driver = DB::connection()->getDriverName();
        $tenantId = $this->getOptionalTenantId();
        $search = request('search');
        $status = request('status');
        $incidentsPresence = request('incidents_presence');

        $sortRaw = (string) request('sort', '');
        [$sortKey, $sortDirectionRaw] = array_pad(explode(':', $sortRaw, 2), 2, 'asc');
        $sortDirection = strtolower($sortDirectionRaw) === 'desc' ? 'desc' : 'asc';

        $contractsQuery = Contract::query()
            ->with([
                'assignedTo:id,name,email',
                'client:id,name,email',
                'tenant:id,name,deleted_at',
            ])
            ->withCount('incidents');

        if ($tenantId !== null) {
            $contractsQuery->ofTenant($tenantId);
        }

        $contracts = $contractsQuery
            ->filterStatus($status)
            ->filterPriority(request('priority'))
            ->withIncidentsPresence($incidentsPresence)
            ->search($search, $driver)
            ->sortForIndex($sortKey, $sortDirection);

        $contracts = $contracts
            ->paginate(request('per_page', 15));

        return $this->paginated($contracts, 'Contracts retrieved successfully');
    }

    /**
     * POST /api/contracts
     * Create a new contract.
     */
    public function store(StoreContractRequest $request): JsonResponse
    {
        $this->authorize('create', Contract::class);

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create contracts for archived tenant', 422);
        }

        $contract = DB::transaction(function () use ($tenantId, $request): Contract {
            return Contract::create([
                'tenant_id' => $tenantId,
                ...$request->validated(),
                'status' => 'draft',
                'created_at' => now(),
            ]);
        });

        broadcast(new ContractUpdated($contract, 'created'))->toOthers();

        return $this->created(
            new ContractResource($contract->load('assignedTo:id,name,email', 'client:id,name,email', 'tenant:id,name,deleted_at')),
            'Contract created successfully'
        );
    }

    /**
     * GET /api/contracts/{id}
     * Get contract details (including soft-deleted).
     */
    public function show(int $contractId): JsonResponse
    {
        $contract = Contract::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('view', $contract);

        return $this->success(
            new ContractResource($contract->load(
                'assignedTo:id,name,email',
                'client:id,name,email',
                'tenant:id,name,deleted_at',
                'incidents.reportedBy:id,name',
                'incidents.assignedTo:id,name'
            )),
            'Contract retrieved successfully'
        );
    }

    public function incidents(int $contractId): JsonResponse
    {
        $contract = Contract::ofTenant($this->getTenantId())->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('view', $contract);

        $incidents = $contract->incidents()
            ->with('reportedBy:id,name', 'assignedTo:id,name')
            ->orderBy('reported_at', 'desc')
            ->get();

        $mappedIncidents = [];
        foreach ($incidents as $incident) {
            if (! $incident instanceof ContractIncident) {
                continue;
            }

            $mappedIncidents[] = [
                'id' => $incident->id,
                'title' => $incident->title,
                'description' => $incident->description,
                'severity' => $incident->severity,
                'status' => $incident->status,
                'reported_at' => $incident->reported_at->toIso8601String(),
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
                'reported_by' => $incident->reportedBy ? [
                    'id' => data_get($incident, 'reportedBy.id'),
                    'name' => data_get($incident, 'reportedBy.name'),
                ] : null,
                'assigned_to' => $incident->assignedTo ? [
                    'id' => data_get($incident, 'assignedTo.id'),
                    'name' => data_get($incident, 'assignedTo.name'),
                ] : null,
            ];
        }

        return $this->success($mappedIncidents, 'Contract incidents retrieved successfully');
    }

    public function storeIncident(StoreContractIncidentRequest $request, int $contractId): JsonResponse
    {
        $contract = Contract::ofTenant($this->getTenantId())->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('update', $contract);

        $validated = $request->validated();

        $status = $validated['status'] ?? 'open';

        $incident = ContractIncident::create([
            'contract_id' => $contract->id,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'severity' => $validated['severity'],
            'status' => $status,
            'reported_by' => auth()->id(),
            'assigned_to' => null,
            'reported_at' => now(),
            'resolved_at' => in_array($status, ['resolved', 'closed'], true) ? now() : null,
        ]);

        return $this->created([
            'id' => $incident->id,
            'title' => $incident->title,
            'description' => $incident->description,
            'severity' => $incident->severity,
            'status' => $incident->status,
            'reported_at' => $incident->reported_at->toIso8601String(),
            'resolved_at' => $incident->resolved_at?->toIso8601String(),
        ], 'Contract incident created successfully');
    }

    public function updateIncident(int $contractId, int $incidentId): JsonResponse
    {
        $contract = Contract::ofTenant($this->getTenantId())->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('update', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        $incident = ContractIncident::where('contract_id', $contract->id)->find($incidentId);
        if (! $incident) {
            return $this->notFound('Contract incident not found');
        }

        $validated = request()->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'severity' => 'sometimes|required|in:low,medium,high,critical',
            'status' => 'sometimes|required|in:open,in_review,resolved,closed',
        ]);

        if (array_key_exists('status', $validated)) {
            if (in_array($validated['status'], ['resolved', 'closed'], true) && ! $incident->resolved_at) {
                $validated['resolved_at'] = now();
            }
            if (! in_array($validated['status'], ['resolved', 'closed'], true)) {
                $validated['resolved_at'] = null;
            }
        }

        $incident->update($validated);

        return $this->success([
            'id' => $incident->id,
            'title' => $incident->title,
            'description' => $incident->description,
            'severity' => $incident->severity,
            'status' => $incident->status,
            'reported_at' => $incident->reported_at->toIso8601String(),
            'resolved_at' => $incident->resolved_at?->toIso8601String(),
        ], 'Contract incident updated successfully');
    }

    public function destroyIncident(int $contractId, int $incidentId): JsonResponse
    {
        $contract = Contract::ofTenant($this->getTenantId())->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('delete', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        $incident = ContractIncident::where('contract_id', $contract->id)->find($incidentId);
        if (! $incident) {
            return $this->notFound('Contract incident not found');
        }

        $incident->delete();

        return $this->success(null, 'Contract incident deleted successfully');
    }

    /**
     * PUT /api/contracts/{id}
     * Aktualizuje kontrakt
     */
    public function update(UpdateContractRequest $request, Contract $contract): JsonResponse
    {
        $this->authorize('update', $contract);

        $validated = $request->validated();
        $hasStatusUpdate = array_key_exists('status', $validated);
        $shouldChangeStatus = $hasStatusUpdate && $validated['status'] !== $contract->status;

        if ($shouldChangeStatus) {
            $this->authorize('changeStatus', $contract);
        }

        $targetTenantId = (int) ($validated['tenant_id'] ?? $contract->tenant_id);
        $this->assertWritableTenant($targetTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot update contracts for archived tenant', 422);
        }

        $oldValues = $contract->only(array_keys($validated));
        $attributes = $validated;
        unset($attributes['status']);
        $actor = $request->user();

        DB::transaction(function () use ($actor, $attributes, $contract, $shouldChangeStatus, $validated): void {
            if ($attributes !== []) {
                $contract->update($attributes);
            }

            if ($shouldChangeStatus && $actor) {
                $contract->changeStatus($validated['status'], $actor, 'Updated via contract edit');
            }
        });

        broadcast(new ContractUpdated($contract, 'updated', $oldValues))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()->load('assignedTo:id,name,email', 'client:id,name,email', 'tenant:id,name,deleted_at')),
            'Contract updated successfully'
        );
    }

    /**
     * DELETE /api/contracts/{id}
     * Smaže kontrakt (soft delete)
     */
    public function destroy(Contract $contract): JsonResponse
    {
        $this->authorize('delete', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($contract->tenant_id)) {
            return $this->error('Cannot delete contracts for archived tenant', 422);
        }

        DB::transaction(function () use ($contract): void {
            $contract->delete();
        });

        broadcast(new ContractUpdated($contract, 'deleted'))->toOthers();

        return $this->success(null, 'Contract deleted successfully');
    }

    /**
     * DELETE /api/contracts/{id}/hard-delete
     * Trvale smaže kontrakt (hard delete)
     */
    public function hardDelete(int $id): JsonResponse
    {
        $contract = Contract::withoutGlobalScopes()
            ->withTrashed()
            ->find($id);

        $resolvedViaEloquent = $contract !== null;

        if (! $contract) {
            $contractRow = DB::table('contracts')->where('id', $id)->first();

            if (! $contractRow) {
                return $this->success(null, 'Contract permanently deleted successfully');
            }

            // Fallback model for policy checks when Eloquent retrieval is unexpectedly empty.
            $contract = new Contract;
            $contract->forceFill((array) $contractRow);
            $contract->exists = true;
        }

        $this->assertTenantAccess((int) $contract->tenant_id);
        $this->authorize('forceDelete', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        if (! $contract->trashed()) {
            return $this->error('Hard delete is allowed only after soft delete', 422);
        }

        DB::transaction(function () use ($contract, $resolvedViaEloquent): void {
            if ($resolvedViaEloquent) {
                // Manually delete associated status history records as they are not cascades
                $contract->statusHistory()->delete();

                $contract->forceDelete();

                return;
            }

            DB::table('contract_status_histories')->where('contract_id', $contract->id)->delete();
            DB::table('contracts')->where('id', $contract->id)->delete();
        });

        return $this->success(null, 'Contract permanently deleted successfully');
    }

    /**
     * POST /api/contracts/{id}/restore
     * Obnoví soft-deleted kontrakt
     */
    public function restore(int $contractId): JsonResponse
    {
        $contract = Contract::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($contractId);

        if (! $contract) {
            return $this->notFound('Contract not found');
        }

        $this->authorize('restore', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        if (! $contract->trashed()) {
            return $this->error('Restore is allowed only for soft-deleted contracts', 422);
        }

        DB::transaction(function () use ($contract): void {
            $contract->restore();
        });

        broadcast(new ContractUpdated($contract, 'restored'))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()->load('assignedTo:id,name,email', 'client:id,name,email', 'tenant:id,name,deleted_at')),
            'Contract restored successfully'
        );
    }

    /**
     * POST /api/contracts/{id}/approve
     * Schválí kontrakt
     */
    public function approve(Contract $contract): JsonResponse
    {
        $this->authorize('approve', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($contract->tenant_id)) {
            return $this->error('Cannot approve contracts for archived tenant', 422);
        }

        if ($contract->status !== 'draft') {
            return $this->error('Only draft contracts can be approved', 422);
        }

        DB::transaction(function () use ($contract): void {
            $contract->changeStatus('approved', auth()->user(), 'Approved via API');
        });

        broadcast(new ContractUpdated($contract, 'approved'))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()),
            'Contract approved successfully'
        );
    }

    /**
     * POST /api/contracts/{id}/change-status
     * Změní status kontraktu
     */
    public function changeStatus(ChangeContractStatusRequest $request, Contract $contract): JsonResponse
    {
        $this->authorize('changeStatus', $contract);
        $this->assertWritableTenant((int) $contract->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($contract->tenant_id)) {
            return $this->error('Cannot change status of contracts for archived tenant', 422);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($contract, $validated): void {
            $contract->changeStatus(
                $validated['status'],
                auth()->user(),
                $validated['reason'] ?? null
            );
        });

        broadcast(new ContractUpdated($contract, 'status_changed', ['status' => $validated['status']]))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()),
            'Contract status changed successfully'
        );
    }
}
