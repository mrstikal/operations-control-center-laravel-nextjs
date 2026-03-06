<?php

namespace App\Http\Controllers\Api;

use App\Events\AssetUpdated;
use App\Http\Requests\AssetAuditTrailRequest;
use App\Http\Requests\StoreAssetMaintenanceLogRequest;
use App\Http\Requests\StoreAssetMaintenanceScheduleRequest;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetMaintenanceLogRequest;
use App\Http\Requests\UpdateAssetMaintenanceScheduleRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Http\Resources\MaintenanceLogResource;
use App\Http\Resources\MaintenanceScheduleResource;
use App\Models\Asset;
use App\Models\MaintenanceLog;
use App\Models\MaintenanceSchedule;
use App\Services\Assets\AssetLifecycleService;
use App\Services\Maintenance\MaintenanceScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * AssetController - REST API for Assets.
 *
 * Lifecycle and maintenance business logic is delegated to
 * {@see AssetLifecycleService}.
 */
class AssetController extends BaseApiController
{
    public function __construct(
        private readonly MaintenanceScheduleService $maintenanceScheduleService,
        private readonly AssetLifecycleService $assetLifecycleService,
    ) {}

    /**
     * GET /api/assets
     * List assets with pagination.
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

        $query = Asset::query();

        if ($tenantId !== null) {
            $query->ofTenant($tenantId);
        }

        $assets = $query
            ->with([
                'category:id,name',
                'tenant:id,name,deleted_at',
                'assignedTo:id,name',
            ])
            ->filterStatus($status)
            ->filterCategory(request('category_id'))
            ->filterLocation(request('location'))
            ->filterDueForMaintenance(request('due_for_maintenance'))
            ->search($search, $driver)
            ->sortForIndex($sortKey, $sortDirection);

        $assets = $assets->paginate(request('per_page', 15));

        return $this->paginated($assets, 'Assets retrieved successfully');
    }

    /**
     * POST /api/assets
     * Create a new asset.
     */
    public function store(StoreAssetRequest $request): JsonResponse
    {
        $this->authorize('create', Asset::class);

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create assets for archived tenant', 422);
        }

        $validated = $request->validated();

        $asset = Asset::create([
            'tenant_id' => $tenantId,
            ...$validated,
            'status' => 'operational',
        ]);

        $asset->scheduleNextMaintenance();

        $asset->recordAudit(
            'created',
            auth()->id(),
            null,
            $asset->fresh()->only(array_merge(array_keys($validated), ['status']))
        );

        // Broadcast asset created event
        broadcast(new AssetUpdated($asset, 'created'))->toOthers();

        return $this->created(
            new AssetResource($asset->load('category', 'tenant:id,name,deleted_at')),
            'Asset created successfully'
        );
    }

    /**
     * GET /api/assets/{id}
     * Return asset detail.
     */
    public function show(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        return $this->success(
            new AssetResource($asset->load('category:id,name', 'tenant:id,name,deleted_at', 'assignedTo:id,name')),
            'Asset retrieved successfully'
        );
    }

    /**
     * PUT /api/assets/{id}
     * Update asset.
     */
    public function update(UpdateAssetRequest $request, Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);

        $validated = $request->validated();
        $targetTenantId = (int) ($validated['tenant_id'] ?? $asset->tenant_id);
        $this->assertWritableTenant($targetTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot update assets for archived tenant', 422);
        }

        $oldValues = $asset->only(array_keys($validated));
        $oldStatus = $asset->status;

        DB::transaction(function () use ($asset, $validated, $oldValues, $oldStatus): void {
            $asset->update($validated);

            $newValues = $asset->fresh()->only(array_keys($validated));
            $action = array_key_exists('status', $validated) && $oldStatus !== $asset->status ? 'status_changed' : 'updated';
            $reason = $this->resolveReasonIfRequired($action === 'status_changed');

            $asset->recordAudit(
                $action,
                auth()->id(),
                $oldValues,
                $newValues,
                $reason
            );
        });

        broadcast(new AssetUpdated($asset, 'updated', $oldValues))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset updated successfully'
        );
    }

    /**
     * DELETE /api/assets/{id}
     * Delete asset (soft delete).
     */
    public function destroy(Asset $asset): JsonResponse
    {
        $this->authorize('delete', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($asset->tenant_id)) {
            return $this->error('Cannot delete assets for archived tenant', 422);
        }

        $reason = $this->resolveReasonIfRequired(true);

        DB::transaction(function () use ($asset, $reason): void {
            $asset->recordAudit(
                'deleted',
                auth()->id(),
                $asset->only(['status', 'name', 'asset_tag', 'location']),
                null,
                $reason
            );

            $asset->delete();
        });

        broadcast(new AssetUpdated($asset, 'deleted'))->toOthers();

        return $this->success(null, 'Asset deleted successfully');
    }

    /**
     * GET /api/assets/{id}/maintenance-logs
     * Return maintenance logs for a specific asset.
     */
    public function maintenanceLogs(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        $validated = request()->validate([
            'type' => ['nullable', Rule::in(['preventive', 'corrective', 'inspection', 'repair'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logsQuery = $asset->maintenanceLogs()->with('performedBy:id,name');

        if (isset($validated['type'])) {
            $logsQuery->where('type', $validated['type']);
        }

        if (isset($validated['from'])) {
            $logsQuery->where('performed_at', '>=', $validated['from']);
        }

        if (isset($validated['to'])) {
            $logsQuery->where('performed_at', '<=', $validated['to']);
        }

        $logs = $logsQuery->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'message' => 'Maintenance logs retrieved successfully',
            'data' => MaintenanceLogResource::collection($logs->items()),
            'pagination' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
        ]);
    }

    /**
     * GET /api/assets/{id}/maintenance-schedules
     * Return maintenance schedules for a specific asset.
     */
    public function maintenanceSchedules(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        $validated = request()->validate([
            'frequency' => ['nullable', Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])],
            'is_active' => ['nullable', 'boolean'],
            'overdue' => ['nullable', 'boolean'],
            'due_before' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $scheduleQuery = $asset->maintenanceSchedules();

        if (isset($validated['frequency'])) {
            $scheduleQuery->where('frequency', $validated['frequency']);
        }

        if (array_key_exists('is_active', $validated)) {
            $scheduleQuery->where('is_active', (bool) $validated['is_active']);
        }

        if (! empty($validated['overdue'])) {
            $scheduleQuery->where('next_due_date', '<=', now())->where('is_active', true);
        }

        if (isset($validated['due_before'])) {
            $scheduleQuery->where('next_due_date', '<=', $validated['due_before']);
        }

        $schedules = $scheduleQuery
            ->orderBy('next_due_date', 'asc')
            ->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'message' => 'Maintenance schedules retrieved successfully',
            'data' => MaintenanceScheduleResource::collection($schedules->items()),
            'pagination' => [
                'total' => $schedules->total(),
                'per_page' => $schedules->perPage(),
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'from' => $schedules->firstItem(),
                'to' => $schedules->lastItem(),
            ],
        ]);
    }

    /**
     * GET /api/maintenance-logs
     * Return maintenance logs across assets in tenant scope.
     */
    public function globalMaintenanceLogs(): JsonResponse
    {
        $validated = request()->validate([
            'asset_id' => ['nullable', 'integer', 'min:1'],
            'asset_name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(['preventive', 'corrective', 'inspection', 'repair'])],
            'performed_by' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $tenantId = $this->getOptionalTenantId();
        $assetNameFilter = $validated['asset_name'] ?? null;

        $logsQuery = MaintenanceLog::query()
            ->with(['performedBy:id,name', 'asset:id,name,asset_tag'])
            ->whereHas('asset', function ($query) use ($tenantId, $assetNameFilter): void {
                if ($tenantId !== null) {
                    $query->where('tenant_id', $tenantId);
                }
                if ($assetNameFilter !== null) {
                    $query->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($assetNameFilter).'%']);
                }
            });

        if (isset($validated['asset_id'])) {
            $logsQuery->where('asset_id', (int) $validated['asset_id']);
        }

        if (isset($validated['type'])) {
            $logsQuery->where('type', $validated['type']);
        }

        if (isset($validated['performed_by'])) {
            $logsQuery->where('performed_by', (int) $validated['performed_by']);
        }

        if (isset($validated['from'])) {
            $logsQuery->where('performed_at', '>=', $validated['from']);
        }

        if (isset($validated['to'])) {
            $logsQuery->where('performed_at', '<=', $validated['to']);
        }

        $logs = $logsQuery
            ->orderBy('performed_at', 'desc')
            ->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'message' => 'Maintenance logs retrieved successfully',
            'data' => MaintenanceLogResource::collection($logs->items()),
            'pagination' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
        ]);
    }

    /**
     * GET /api/maintenance-schedules
     * Return maintenance schedules across assets in tenant scope.
     */
    public function globalMaintenanceSchedules(): JsonResponse
    {
        $validated = request()->validate([
            'asset_id' => ['nullable', 'integer', 'min:1'],
            'asset_name' => ['nullable', 'string', 'max:255'],
            'frequency' => ['nullable', Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])],
            'is_active' => ['nullable', 'boolean'],
            'overdue' => ['nullable', 'boolean'],
            'due_state' => ['nullable', Rule::in([
                MaintenanceSchedule::DUE_STATE_OK,
                MaintenanceSchedule::DUE_STATE_DUE_SOON,
                MaintenanceSchedule::DUE_STATE_OVERDUE,
            ])],
            'due_before' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $tenantId = $this->getOptionalTenantId();
        $assetNameFilter = $validated['asset_name'] ?? null;

        $scheduleQuery = MaintenanceSchedule::query()
            ->with('asset:id,name,asset_tag')
            ->whereHas('asset', function ($query) use ($tenantId, $assetNameFilter): void {
                if ($tenantId !== null) {
                    $query->where('tenant_id', $tenantId);
                }
                if ($assetNameFilter !== null) {
                    $query->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($assetNameFilter).'%']);
                }
            });

        if (isset($validated['asset_id'])) {
            $scheduleQuery->where('asset_id', (int) $validated['asset_id']);
        }

        if (isset($validated['frequency'])) {
            $scheduleQuery->where('frequency', $validated['frequency']);
        }

        if (array_key_exists('is_active', $validated)) {
            $scheduleQuery->where('is_active', (bool) $validated['is_active']);
        }

        if (! empty($validated['overdue'])) {
            $scheduleQuery->where('next_due_date', '<=', now())->where('is_active', true);
        }

        if (isset($validated['due_state'])) {
            $scheduleQuery->where('due_state', $validated['due_state']);
        }

        if (isset($validated['due_before'])) {
            $scheduleQuery->where('next_due_date', '<=', $validated['due_before']);
        }

        $schedules = $scheduleQuery
            ->orderBy('next_due_date', 'asc')
            ->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'message' => 'Maintenance schedules retrieved successfully',
            'data' => MaintenanceScheduleResource::collection($schedules->items()),
            'pagination' => [
                'total' => $schedules->total(),
                'per_page' => $schedules->perPage(),
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'from' => $schedules->firstItem(),
                'to' => $schedules->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/assets/{id}/log-maintenance
     * Log maintenance for an asset.
     */
    public function logMaintenance(StoreAssetMaintenanceLogRequest $request, Asset $asset): JsonResponse
    {
        $this->authorize('logMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        $validated = $request->validated();

        $result = $this->assetLifecycleService->logMaintenance($asset, $validated, auth()->id());
        $maintenanceLog = $result['log'];

        broadcast(new AssetUpdated($asset, 'maintenance_logged', ['type' => $validated['type']]))->toOthers();

        return $this->success(
            [
                'asset' => new AssetResource($asset->fresh()),
                'maintenance_log' => new MaintenanceLogResource($maintenanceLog->load('performedBy:id,name')),
            ],
            'Maintenance logged successfully'
        );
    }

    /**
     * POST /api/assets/{id}/schedule-maintenance
     * Schedule maintenance for an asset.
     */
    public function scheduleMaintenance(StoreAssetMaintenanceScheduleRequest $request, Asset $asset): JsonResponse
    {
        $this->authorize('scheduleMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        $validated = $request->validated();

        $schedule = $this->assetLifecycleService->scheduleMaintenance($asset, $validated, auth()->id());

        // Broadcast asset maintenance scheduled event
        broadcast(new AssetUpdated($asset, 'maintenance_scheduled', ['frequency' => $validated['frequency']]))->toOthers();

        return $this->created(
            ['schedule' => new MaintenanceScheduleResource($schedule)],
            'Maintenance scheduled successfully'
        );
    }

    /**
     * PATCH /api/assets/{asset}/maintenance-logs/{maintenanceLog}
     * Update an asset maintenance log.
     */
    public function updateMaintenanceLog(
        UpdateAssetMaintenanceLogRequest $request,
        Asset $asset,
        MaintenanceLog $maintenanceLog
    ): JsonResponse {
        $this->authorize('logMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ((int) $maintenanceLog->asset_id !== (int) $asset->id) {
            return $this->notFound('Maintenance log not found');
        }

        $validated = $request->validated();

        if ($validated === []) {
            return $this->error('No changes provided', 422);
        }

        $oldValues = $maintenanceLog->only([
            'type', 'description', 'hours_spent', 'cost', 'performed_at', 'notes', 'parts_replaced',
        ]);

        $maintenanceLog->update($validated);

        $asset->recordAudit(
            'maintenance_log_updated',
            auth()->id(),
            $oldValues,
            $maintenanceLog->fresh()->only(array_keys($validated))
        );

        broadcast(new AssetUpdated($asset, 'maintenance_log_updated', ['maintenance_log_id' => $maintenanceLog->id]))->toOthers();

        return $this->success(
            ['maintenance_log' => new MaintenanceLogResource($maintenanceLog->fresh()->load('performedBy:id,name'))],
            'Maintenance log updated successfully'
        );
    }

    /**
     * DELETE /api/assets/{asset}/maintenance-logs/{maintenanceLog}
     * Delete an asset maintenance log.
     */
    public function deleteMaintenanceLog(Asset $asset, MaintenanceLog $maintenanceLog): JsonResponse
    {
        $this->authorize('logMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ((int) $maintenanceLog->asset_id !== (int) $asset->id) {
            return $this->notFound('Maintenance log not found');
        }

        $asset->recordAudit(
            'maintenance_log_deleted',
            auth()->id(),
            $maintenanceLog->only(['id', 'type', 'performed_at']),
            null
        );

        $maintenanceLog->delete();

        broadcast(new AssetUpdated($asset, 'maintenance_log_deleted', ['maintenance_log_id' => $maintenanceLog->id]))->toOthers();

        return $this->success(null, 'Maintenance log deleted successfully');
    }

    /**
     * PATCH /api/assets/{asset}/maintenance-schedules/{maintenanceSchedule}
     * Update an asset maintenance schedule.
     */
    public function updateMaintenanceSchedule(
        UpdateAssetMaintenanceScheduleRequest $request,
        Asset $asset,
        MaintenanceSchedule $maintenanceSchedule
    ): JsonResponse {
        $this->authorize('scheduleMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ((int) $maintenanceSchedule->asset_id !== (int) $asset->id) {
            return $this->notFound('Maintenance schedule not found');
        }

        $validated = $request->validated();

        if ($validated === []) {
            return $this->error('No changes provided', 422);
        }

        $oldValues = $maintenanceSchedule->only([
            'frequency', 'interval_days', 'description', 'next_due_date', 'is_active', 'notification_settings',
        ]);

        $maintenanceSchedule->update($validated);

        $this->maintenanceScheduleService->syncAssetNextMaintenance($asset);

        $asset->recordAudit(
            'maintenance_schedule_updated',
            auth()->id(),
            $oldValues,
            $maintenanceSchedule->fresh()->only(array_keys($validated))
        );

        broadcast(new AssetUpdated($asset, 'maintenance_schedule_updated', ['maintenance_schedule_id' => $maintenanceSchedule->id]))->toOthers();

        return $this->success(
            ['schedule' => new MaintenanceScheduleResource($maintenanceSchedule->fresh())],
            'Maintenance schedule updated successfully'
        );
    }

    /**
     * DELETE /api/assets/{asset}/maintenance-schedules/{maintenanceSchedule}
     * Soft-delete an asset maintenance schedule.
     */
    public function deleteMaintenanceSchedule(Asset $asset, MaintenanceSchedule $maintenanceSchedule): JsonResponse
    {
        $this->authorize('scheduleMaintenance', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ((int) $maintenanceSchedule->asset_id !== (int) $asset->id) {
            return $this->notFound('Maintenance schedule not found');
        }

        $asset->recordAudit(
            'maintenance_schedule_deleted',
            auth()->id(),
            $maintenanceSchedule->only(['id', 'frequency', 'next_due_date', 'is_active']),
            null
        );

        $maintenanceSchedule->delete();

        $this->maintenanceScheduleService->syncAssetNextMaintenance($asset);

        broadcast(new AssetUpdated($asset, 'maintenance_schedule_deleted', ['maintenance_schedule_id' => $maintenanceSchedule->id]))->toOthers();

        return $this->success(null, 'Maintenance schedule deleted successfully');
    }

    /**
     * POST /api/assets/{id}/restore
     * Restore a soft-deleted asset.
     */
    public function restore(int $assetId): JsonResponse
    {
        $asset = Asset::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($assetId);

        if (! $asset) {
            return $this->notFound('Asset not found');
        }

        $this->authorize('restore', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if (! $asset->trashed()) {
            return $this->error('Restore is allowed only for soft-deleted assets', 422);
        }

        $reason = $this->resolveReasonIfRequired(true);

        DB::transaction(function () use ($asset, $reason): void {
            $asset->restore();

            $asset->recordAudit(
                'restored',
                auth()->id(),
                ['deleted_at' => true],
                ['deleted_at' => false],
                $reason
            );
        });

        broadcast(new AssetUpdated($asset, 'restored'))->toOthers();

        return $this->success(
            new AssetResource($asset->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset restored successfully'
        );
    }

    /**
     * DELETE /api/assets/{id}/hard-delete
     * Permanently delete asset.
     */
    public function hardDelete(int $assetId): JsonResponse
    {
        $asset = Asset::withTrashed()
            ->ofTenant($this->getTenantId())
            ->find($assetId);

        if (! $asset) {
            return $this->notFound('Asset not found');
        }

        $this->authorize('forceDelete', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if (! $asset->trashed()) {
            return $this->error('Hard delete is allowed only after soft delete', 422);
        }

        $this->resolveReasonIfRequired(true);

        DB::transaction(function () use ($asset): void {
            $asset->forceDelete();
        });

        broadcast(new AssetUpdated($asset, 'hard_deleted'))->toOthers();

        return $this->success(null, 'Asset permanently deleted');
    }

    /**
     * GET /api/assets/{id}/audit-trail
     * Return asset audit trail with filters.
     */
    public function auditTrail(AssetAuditTrailRequest $request, Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        $filters = $request->validated();

        $audit = $asset->auditTrail()
            ->with('user:id,name')
            ->byAction($filters['action'] ?? null)
            ->byUser($filters['user_id'] ?? null)
            ->betweenDates($filters['date_from'] ?? null, $filters['date_to'] ?? null)
            ->paginate($filters['per_page'] ?? 15);

        return $this->paginated($audit, 'Asset audit trail retrieved successfully');
    }

    /**
     * POST /api/assets/{id}/retire
     * Retire asset (set status to retired).
     */
    public function retire(Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ($asset->status === 'retired') {
            return $this->error('Asset is already retired', 422);
        }

        $validated = request()->validate([
            'reason' => 'required|string|max:1000',
            'retirement_date' => 'nullable|date',
        ]);

        $this->assetLifecycleService->retire($asset, $validated, auth()->id());

        broadcast(new AssetUpdated($asset, 'retired'))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset retired successfully'
        );
    }

    /**
     * POST /api/assets/{id}/dispose
     * Mark asset as disposed.
     */
    public function dispose(Asset $asset): JsonResponse
    {
        $this->authorize('delete', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        if ($asset->status === 'disposed') {
            return $this->error('Asset is already disposed', 422);
        }

        $validated = request()->validate([
            'reason' => 'required|string|max:1000',
            'disposal_method' => 'nullable|string|max:255',
            'disposal_date' => 'nullable|date',
        ]);

        $this->assetLifecycleService->dispose($asset, $validated, auth()->id());

        broadcast(new AssetUpdated($asset, 'disposed'))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset disposed successfully'
        );
    }

    /**
     * POST /api/assets/{id}/transfer
     * Transfer asset to another location/department.
     */
    public function transfer(Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        $validated = request()->validate([
            'location' => 'required|string|max:255',
            'department' => 'nullable|string|max:100',
            'reason' => 'required|string|max:1000',
        ]);

        $this->assetLifecycleService->transfer($asset, $validated, auth()->id());

        broadcast(new AssetUpdated($asset, 'transferred'))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset transferred successfully'
        );
    }

    /**
     * POST /api/assets/{id}/reassign
     * Reassign asset to another owner/user.
     */
    public function reassign(Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);
        $this->assertWritableTenant((int) $asset->tenant_id);

        $validated = request()->validate([
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', $asset->tenant_id)),
            ],
            'reason' => 'required|string|max:1000',
        ]);

        $this->assetLifecycleService->reassign($asset, $validated, auth()->id());

        broadcast(new AssetUpdated($asset, 'reassigned'))->toOthers();

        return $this->success(
            new AssetResource($asset->fresh()->load('category', 'tenant', 'assignedTo:id,name')),
            'Asset reassigned successfully'
        );
    }

    /**
     * Validate and return reason for sensitive actions.
     */
    private function resolveReasonIfRequired(bool $required): ?string
    {
        if (! $required) {
            return request('reason');
        }

        return request()->validate([
            'reason' => 'required|string|max:1000',
        ])['reason'];
    }
}
