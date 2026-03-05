<?php

namespace App\Http\Controllers\Api;

use App\Events\ContractUpdated;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\UpdateContractRequest;
use App\Http\Resources\ContractResource;
use App\Models\Contract;
use Illuminate\Http\JsonResponse;

/**
 * ContractController - REST API pro Contracts
 */
class ContractController extends BaseApiController
{
    /**
     * GET /api/contracts
     * Vrátí seznam kontraktů s paginací
     */
    public function index(): JsonResponse
    {
        $contracts = Contract::ofTenant($this->getTenantId())
            ->with('assignedTo', 'client', 'statusHistory')
            ->when(request('status'), fn($q) => $q->where('status', request('status')))
            ->when(request('priority'), fn($q) => $q->where('priority', request('priority')))
            ->when(request('search'), fn($q) => $q->whereRaw("MATCH(title, description) AGAINST(? IN BOOLEAN MODE)", [request('search')]))
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 15));

        return $this->paginated($contracts, 'Contracts retrieved successfully');
    }

    /**
     * POST /api/contracts
     * Vytvoří nový kontrakt
     */
    public function store(StoreContractRequest $request): JsonResponse
    {
        $this->authorize('create', Contract::class);

        $contract = Contract::create([
            'tenant_id' => $this->getTenantId(),
            ...$request->validated(),
            'status' => 'draft',
            'created_at' => now(),
        ]);

        // Broadcast contract created event
        broadcast(new ContractUpdated($contract, 'created'))->toOthers();

        return $this->created(
            new ContractResource($contract->load('assignedTo', 'client')),
            'Contract created successfully'
        );
    }

    /**
     * GET /api/contracts/{id}
     * Vrátí detail kontraktu
     */
    public function show(Contract $contract): JsonResponse
    {
        $this->authorize('view', $contract);

        return $this->success(
            new ContractResource($contract->load('assignedTo', 'client', 'incidents', 'statusHistory')),
            'Contract retrieved successfully'
        );
    }

    /**
     * PUT /api/contracts/{id}
     * Aktualizuje kontrakt
     */
    public function update(UpdateContractRequest $request, Contract $contract): JsonResponse
    {
        $this->authorize('update', $contract);

        $oldValues = $contract->only(array_keys($request->validated()));
        $contract->update($request->validated());

        // Broadcast contract updated event
        broadcast(new ContractUpdated($contract, 'updated', $oldValues))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()->load('assignedTo', 'client')),
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

        $contract->delete();

        // Broadcast contract deleted event
        broadcast(new ContractUpdated($contract, 'deleted'))->toOthers();

        return $this->success(null, 'Contract deleted successfully');
    }

    /**
     * POST /api/contracts/{id}/approve
     * Schválí kontrakt
     */
    public function approve(Contract $contract): JsonResponse
    {
        $this->authorize('approve', $contract);

        if ($contract->status !== 'draft') {
            return $this->error('Only draft contracts can be approved', 422);
        }

        $contract->changeStatus('approved', auth()->user(), 'Approved via API');

        // Broadcast contract approved event
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
    public function changeStatus(Contract $contract): JsonResponse
    {
        $this->authorize('changeStatus', $contract);

        $validated = request()->validate([
            'status' => 'required|in:draft,approved,in_progress,blocked,done',
            'reason' => 'nullable|string',
        ]);

        $contract->changeStatus(
            $validated['status'],
            auth()->user(),
            $validated['reason'] ?? null
        );

        // Broadcast contract status changed event
        broadcast(new ContractUpdated($contract, 'status_changed', ['status' => $validated['status']]))->toOthers();

        return $this->success(
            new ContractResource($contract->fresh()),
            'Contract status changed successfully'
        );
    }
}

