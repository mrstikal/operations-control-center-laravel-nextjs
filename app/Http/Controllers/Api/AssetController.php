<?php

namespace App\Http\Controllers\Api;

use App\Events\AssetUpdated;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;

/**
 * AssetController - REST API pro Assets
 */
class AssetController extends BaseApiController
{
    /**
     * GET /api/assets
     * Vrátí seznam assetů s paginací
     */
    public function index(): JsonResponse
    {
        $assets = Asset::ofTenant($this->getTenantId())
            ->with('category')
            ->when(request('status'), fn($q) => $q->where('status', request('status')))
            ->when(request('category_id'), fn($q) => $q->where('category_id', request('category_id')))
            ->when(request('location'), fn($q) => $q->where('location', request('location')))
            ->when(request('due_for_maintenance'), fn($q) => $q->whereBetween('next_maintenance', [now()->startOfDay(), now()->endOfDay()]))
            ->when(request('search'), fn($q) => $q->whereRaw("MATCH(name, description, serial_number) AGAINST(? IN BOOLEAN MODE)", [request('search')]))
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 15));

        return $this->paginated($assets, 'Assets retrieved successfully');
    }

    /**
     * POST /api/assets
     * Vytvoří nový asset
     */
    public function store(StoreAssetRequest $request): JsonResponse
    {
        $this->authorize('create', Asset::class);

        $asset = Asset::create([
            'tenant_id' => $this->getTenantId(),
            ...$request->validated(),
            'status' => 'operational',
        ]);

        $asset->scheduleNextMaintenance();

        // Broadcast asset created event
        broadcast(new AssetUpdated($asset, 'created'))->toOthers();

        return $this->created(
            new AssetResource($asset->load('category')),
            'Asset created successfully'
        );
    }

    /**
     * GET /api/assets/{id}
     * Vrátí detail asetu
     */
    public function show(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        return $this->success(
            new AssetResource($asset->load('category', 'maintenanceLogs', 'maintenanceSchedules', 'incidents')),
            'Asset retrieved successfully'
        );
    }

    /**
     * PUT /api/assets/{id}
     * Aktualizuje asset
     */
    public function update(UpdateAssetRequest $request, Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);

        $oldValues = $asset->only(array_keys($request->validated()));
        $asset->update($request->validated());

        // Broadcast asset updated event
        broadcast(new AssetUpdated($asset, 'updated', $oldValues))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()),
            'Asset updated successfully'
        );
    }

    /**
     * DELETE /api/assets/{id}
     * Smaže asset (soft delete)
     */
    public function destroy(Asset $asset): JsonResponse
    {
        $this->authorize('delete', $asset);

        $asset->delete();

        // Broadcast asset deleted event
        broadcast(new AssetUpdated($asset, 'deleted'))->toOthers();

        return $this->success(null, 'Asset deleted successfully');
    }

    /**
     * POST /api/assets/{id}/log-maintenance
     * Zaznamenává údržbu asetu
     */
    public function logMaintenance(Asset $asset): JsonResponse
    {
        $this->authorize('logMaintenance', $asset);

        $validated = request()->validate([
            'type' => 'required|in:preventive,corrective,inspection,repair',
            'description' => 'required|string',
            'hours_spent' => 'nullable|numeric|min:0.5',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'parts_replaced' => 'nullable|json',
        ]);

        $maintenanceLog = $asset->logMaintenance(
            auth()->user(),
            $validated['type'],
            $validated['description'],
            [
                'hours_spent' => $validated['hours_spent'],
                'cost' => $validated['cost'],
                'notes' => $validated['notes'],
                'parts_replaced' => $validated['parts_replaced'],
            ]
        );

        // Schedule next maintenance
        $asset->scheduleNextMaintenance();

        // Broadcast asset maintenance logged event
        broadcast(new AssetUpdated($asset, 'maintenance_logged', ['type' => $validated['type']]))->toOthers();

        return $this->success(
            [
                'asset' => new AssetResource($asset->fresh()),
                'maintenance_log' => [
                    'id' => $maintenanceLog->id,
                    'type' => $maintenanceLog->type,
                    'description' => $maintenanceLog->description,
                    'performed_at' => $maintenanceLog->performed_at->toIso8601String(),
                ],
            ],
            'Maintenance logged successfully'
        );
    }

    /**
     * POST /api/assets/{id}/schedule-maintenance
     * Plánuje údržbu asetu
     */
    public function scheduleMaintenance(Asset $asset): JsonResponse
    {
        $this->authorize('scheduleMaintenance', $asset);

        $validated = request()->validate([
            'frequency' => 'required|in:daily,weekly,monthly,quarterly,yearly,custom',
            'interval_days' => 'nullable|integer|min:1',
            'description' => 'required|string',
            'notification_settings' => 'nullable|json',
        ]);

        $schedule = $asset->maintenanceSchedules()->create([
            ...$validated,
            'next_due_date' => now()->addDays($validated['interval_days'] ?? 30),
            'is_active' => true,
        ]);

        // Broadcast asset maintenance scheduled event
        broadcast(new AssetUpdated($asset, 'maintenance_scheduled', ['frequency' => $validated['frequency']]))->toOthers();

        return $this->created(
            [
                'schedule' => [
                    'id' => $schedule->id,
                    'frequency' => $schedule->frequency,
                    'next_due_date' => $schedule->next_due_date->toIso8601String(),
                    'is_active' => $schedule->is_active,
                ],
            ],
            'Maintenance scheduled successfully'
        );
    }
}

