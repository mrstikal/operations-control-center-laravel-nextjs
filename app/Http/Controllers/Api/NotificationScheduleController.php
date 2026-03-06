<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreNotificationScheduleRequest;
use App\Http\Requests\UpdateNotificationScheduleRequest;
use App\Models\NotificationSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationScheduleController – Full CRUD for notification schedules.
 * Requires the `notifications,manage_schedules` permission on every endpoint.
 */
class NotificationScheduleController extends BaseApiController
{
    /**
     * GET /api/notification-schedules
     * List all schedules for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();

        $query = NotificationSchedule::where('tenant_id', $tenantId)
            ->orderBy('name');

        if ($request->filled('trigger')) {
            $query->where('trigger', $request->input('trigger'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = (int) $request->input('per_page', 20);
        $schedules = $query->paginate($perPage);

        return $this->paginated($schedules, 'Notification schedules retrieved successfully');
    }

    /**
     * GET /api/notification-schedules/{schedule}
     * Show a single schedule.
     */
    public function show(int $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $schedule = NotificationSchedule::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $schedule) {
            return $this->notFound('Notification schedule not found');
        }

        return $this->success($schedule, 'Notification schedule retrieved successfully');
    }

    /**
     * POST /api/notification-schedules
     * Create a new schedule for the current tenant.
     */
    public function store(StoreNotificationScheduleRequest $request): JsonResponse
    {
        $tenantId = $this->assertWritableTenant();

        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create notification schedules for archived tenant', 422);
        }

        $schedule = NotificationSchedule::create(array_merge(
            $request->validated(),
            ['tenant_id' => $tenantId]
        ));

        return $this->created($schedule, 'Notification schedule created successfully');
    }

    /**
     * PUT /api/notification-schedules/{schedule}
     * Update an existing schedule.
     */
    public function update(UpdateNotificationScheduleRequest $request, int $id): JsonResponse
    {
        $tenantId = $this->assertWritableTenant();

        $schedule = NotificationSchedule::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $schedule) {
            return $this->notFound('Notification schedule not found');
        }

        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot update notification schedules for archived tenant', 422);
        }

        $schedule->update($request->validated());

        return $this->success($schedule->fresh(), 'Notification schedule updated successfully');
    }

    /**
     * DELETE /api/notification-schedules/{schedule}
     * Delete a schedule.
     */
    public function destroy(int $id): JsonResponse
    {
        $tenantId = $this->assertWritableTenant();

        $schedule = NotificationSchedule::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $schedule) {
            return $this->notFound('Notification schedule not found');
        }

        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot delete notification schedules for archived tenant', 422);
        }

        $schedule->delete();

        return $this->success(['deleted' => true], 'Notification schedule deleted successfully');
    }
}
