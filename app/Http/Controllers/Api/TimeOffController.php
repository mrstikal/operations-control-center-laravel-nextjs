<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeeProfile;
use App\Models\TimeOffRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * TimeOffController - Manage time-off requests with approval workflow
 */
class TimeOffController extends BaseApiController
{
    /**
     * Display a listing of time-off requests
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $statusFilter = (string) $request->get('status', '');

        $query = TimeOffRequest::query()
            ->with(['employee.user.roles', 'requestedBy', 'approvedBy']);

        // Default: archived requests are hidden; status=archived shows only archived.
        if ($statusFilter === 'archived') {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        // RBAC filtering
        if ($user->hasRole('Superadmin')) {
            // Superadmin sees all
            if ($request->has('tenant_id')) {
                $query->whereHas('employee.user', fn ($q) => $q->where('tenant_id', $request->tenant_id));
            }
        } elseif ($user->hasRole('Admin')) {
            // Admin sees own tenant
            $query->whereHas('employee.user', fn ($q) => $q->where('tenant_id', $user->tenant_id));
        } elseif ($user->hasRole('Manager')) {
            // Manager sees own department
            $departmentId = $user->employeeProfile->department_id ?? null;
            $query->whereHas('employee.user', fn ($q) => $q->where('tenant_id', $user->tenant_id))
                ->whereHas('employee', fn ($q) => $q
                    ->where('department_id', $departmentId)
                );
        } else {
            // Technician sees own requests
            $employeeId = $user->employeeProfile->id ?? null;
            $query->where('employee_id', $employeeId);
        }

        // Filters
        if ($request->filled('status') && $statusFilter !== 'archived') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Date range filters
        if ($request->filled('from_date')) {
            $query->where('start_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where('end_date', '<=', $request->to_date);
        }

        // Sorting – whitelist column names to prevent SQL injection via column name
        $allowedSortColumns = ['requested_at', 'start_date', 'end_date', 'status', 'type', 'created_at'];
        $allowedSortOrders = ['asc', 'desc'];

        $sortBy = in_array($request->get('sort_by'), $allowedSortColumns, true)
            ? $request->get('sort_by')
            : 'requested_at';
        $sortOrder = in_array(strtolower((string) $request->get('sort_order')), $allowedSortOrders, true)
            ? strtolower((string) $request->get('sort_order'))
            : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 20);
        $requests = $query->paginate($perPage);

        return $this->paginated($requests, 'Time-off requests retrieved successfully');
    }

    /**
     * Display the specified time-off request
     */
    public function show(int $timeOffRequestId): JsonResponse
    {
        $request = TimeOffRequest::with([
            'employee.user.roles',
            'requestedBy',
            'approvedBy',
        ])->find($timeOffRequestId);

        if (! $request) {
            return $this->notFound('Time-off request not found');
        }

        // RBAC check
        if (! $this->canViewRequest($request)) {
            return $this->forbidden('You do not have permission to view this request');
        }

        return $this->success($request, 'Time-off request retrieved successfully');
    }

    /**
     * Store a newly created time-off request
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employee_profiles,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'type' => ['required', Rule::in(['vacation', 'sick_leave', 'personal', 'other'])],
            'reason' => 'nullable|string|max:1000',
        ]);

        $ownEmployee = EmployeeProfile::where('user_id', $user->id)->first();
        if (! $ownEmployee) {
            return $this->forbidden('Employee profile not found for current user');
        }

        $targetEmployee = isset($validated['employee_id'])
            ? EmployeeProfile::with('user')->find($validated['employee_id'])
            : $ownEmployee;

        if (! $targetEmployee) {
            return $this->notFound('Employee profile not found');
        }

        $targetTenantId = $this->employeeTenantId($targetEmployee);
        if ($targetTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($targetTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot create time-off requests for archived tenant', 422);
        }

        $highestRoleLevel = (float) $user->getHighestRoleLevel();

        // Roles lower than Manager can create only their own requests.
        if ($highestRoleLevel < 3 && $targetEmployee->id !== $ownEmployee->id) {
            return $this->forbidden('You can only create time-off requests for yourself');
        }

        // Manager can create only within own department and tenant.
        if ($user->hasRole('Manager')) {
            $departmentId = $user->employeeProfile->department_id ?? null;
            if ($targetTenantId !== (int) $user->tenant_id || $targetEmployee->department_id !== $departmentId) {
                return $this->forbidden('You can only create requests for your department');
            }
        }

        // Admin (non-superadmin) is restricted to own tenant.
        if ($user->hasRole('Admin') && ! $user->hasRole('Superadmin')) {
            if ($targetTenantId !== (int) $user->tenant_id) {
                return $this->forbidden('You can only create requests for your tenant');
            }
        }

        $validated['employee_id'] = $targetEmployee->id;
        $validated['requested_by'] = $user->id;
        $validated['requested_at'] = now();
        $validated['status'] = 'pending';

        $timeOffRequest = TimeOffRequest::create($validated);
        $timeOffRequest->load(['employee.user', 'requestedBy']);

        return $this->created($timeOffRequest, 'Time-off request created successfully');
    }

    /**
     * Update the specified time-off request
     */
    public function update(Request $request, int $timeOffRequestId): JsonResponse
    {
        $user = Auth::user();
        $timeOffRequest = TimeOffRequest::find($timeOffRequestId);

        if (! $timeOffRequest) {
            return $this->notFound('Time-off request not found');
        }

        // Only pending requests can be updated
        if ($timeOffRequest->status !== 'pending') {
            return $this->error('Only pending requests can be updated', 422);
        }

        // Check permission
        if (! $this->canUpdateRequest($timeOffRequest)) {
            return $this->forbidden('You do not have permission to update this request');
        }

        $requestEmployee = EmployeeProfile::with('user')->find($timeOffRequest->employee_id);
        if (! $requestEmployee) {
            return $this->notFound('Employee profile not found');
        }

        $requestTenantId = $this->employeeTenantId($requestEmployee);
        if ($requestTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($requestTenantId);

        $validated = $request->validate([
            'start_date' => 'sometimes|required|date|after_or_equal:today',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'type' => ['sometimes', 'required', Rule::in(['vacation', 'sick_leave', 'personal', 'other'])],
            'reason' => 'nullable|string|max:1000',
        ]);

        $timeOffRequest->update($validated);
        $timeOffRequest->load(['employee.user', 'requestedBy']);

        return $this->success($timeOffRequest, 'Time-off request updated successfully');
    }

    /**
     * Approve or reject time-off request
     */
    public function decide(Request $request, int $timeOffRequestId): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasPermissionTo('hr.approve_timeoff')) {
            return $this->forbidden('You do not have permission to approve time-off requests');
        }

        $timeOffRequest = TimeOffRequest::with(['employee.user.roles'])->find($timeOffRequestId);

        if (! $timeOffRequest) {
            return $this->notFound('Time-off request not found');
        }

        if ($timeOffRequest->status !== 'pending') {
            return $this->error('Only pending requests can be approved or rejected', 422);
        }

        $targetEmployee = EmployeeProfile::with('user.roles')->find($timeOffRequest->employee_id);
        $targetUserId = (int) data_get($targetEmployee, 'user_id', 0);
        if (! $targetEmployee || $targetUserId <= 0) {
            return $this->error('Target employee user not found', 422);
        }

        $targetTenantId = $this->employeeTenantId($targetEmployee);
        if ($targetTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($targetTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot approve/reject requests for archived tenant', 422);
        }

        $targetUser = User::find($targetUserId);
        if (! $targetUser) {
            return $this->error('Target employee user not found', 422);
        }

        $actorHighestLevel = (float) $user->getHighestRoleLevel();
        $targetHighestLevel = (float) ($targetUser->roles()->max('level') ?? 0.0);
        $isSelfDecision = $targetUserId === (int) $user->id;
        $isSuperadmin = $user->hasRole('Superadmin');

        // Rule: only Manager+ can decide.
        if ($actorHighestLevel < 3) {
            return $this->forbidden('Only Manager or higher can approve/reject requests');
        }

        // Rule: Manager+ can decide only for subordinate roles.
        // Exception: Superadmin can decide for self as well.
        $canDecide = $isSuperadmin && $isSelfDecision;
        if (! $canDecide) {
            $canDecide = $targetHighestLevel < $actorHighestLevel;
        }

        if (! $canDecide) {
            return $this->forbidden('You can approve/reject only subordinate roles');
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'approval_note' => 'nullable|string|max:500',
        ]);

        $timeOffRequest->update([
            'status' => $validated['status'],
            'approval_note' => $validated['approval_note'] ?? null,
            'approved_by' => $user->id,
            'decided_at' => now(),
        ]);

        // If approved, update employee availability
        if ($validated['status'] === 'approved') {
            $timeOffRequest->employee->update([
                'availability_status' => 'on_leave',
                'availability_until' => $timeOffRequest->end_date,
            ]);
        }

        $timeOffRequest->load(['employee.user', 'requestedBy', 'approvedBy']);

        return $this->success($timeOffRequest, "Time-off request {$validated['status']} successfully");
    }

    /**
     * Cancel a time-off request
     */
    public function cancel(int $timeOffRequestId): JsonResponse
    {
        $user = Auth::user();
        $timeOffRequest = TimeOffRequest::find($timeOffRequestId);

        if (! $timeOffRequest) {
            return $this->notFound('Time-off request not found');
        }

        // Can only cancel own requests or if manager/admin
        if (! $this->canUpdateRequest($timeOffRequest)) {
            return $this->forbidden('You do not have permission to cancel this request');
        }

        if ($timeOffRequest->status === 'cancelled') {
            return $this->error('Request is already cancelled', 422);
        }

        $requestEmployee = EmployeeProfile::with('user')->find($timeOffRequest->employee_id);
        if (! $requestEmployee) {
            return $this->notFound('Employee profile not found');
        }

        $requestTenantId = $this->employeeTenantId($requestEmployee);
        if ($requestTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($requestTenantId);

        $previousStatus = $timeOffRequest->status;

        $timeOffRequest->update([
            'status' => 'cancelled',
            'decided_at' => now(),
        ]);

        // If was approved, revert employee availability
        if ($previousStatus === 'approved') {
            $timeOffRequest->employee->update([
                'availability_status' => 'available',
                'availability_until' => null,
            ]);
        }

        return $this->success($timeOffRequest, 'Time-off request cancelled successfully');
    }

    /**
     * Get time-off statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = TimeOffRequest::query();

        // Apply RBAC filtering
        if ($user->hasRole('Superadmin')) {
            // See all
        } elseif ($user->hasRole('Admin')) {
            $query->whereHas('employee.user', fn ($q) => $q->where('tenant_id', $user->tenant_id));
        } elseif ($user->hasRole('Manager')) {
            $departmentId = $user->employeeProfile->department_id ?? null;
            $query->whereHas('employee.user', fn ($q) => $q->where('tenant_id', $user->tenant_id))
                ->whereHas('employee', fn ($q) => $q
                    ->where('department_id', $departmentId)
                );
        } else {
            $employeeId = $user->employeeProfile->id ?? null;
            $query->where('employee_id', $employeeId);
        }

        // Filter by year
        $year = $request->get('year', now()->year);
        $query->whereYear('start_date', $year);

        $stats = [
            'total' => $query->count(),
            'by_status' => [
                'pending' => $query->clone()->where('status', 'pending')->count(),
                'approved' => $query->clone()->where('status', 'approved')->count(),
                'rejected' => $query->clone()->where('status', 'rejected')->count(),
                'cancelled' => $query->clone()->where('status', 'cancelled')->count(),
            ],
            'by_type' => [
                'vacation' => $query->clone()->where('type', 'vacation')->count(),
                'sick_leave' => $query->clone()->where('type', 'sick_leave')->count(),
                'personal' => $query->clone()->where('type', 'personal')->count(),
                'other' => $query->clone()->where('type', 'other')->count(),
            ],
        ];

        return $this->success($stats, 'Time-off statistics retrieved');
    }

    /**
     * Archive a time-off request (Admin/Superadmin only)
     */
    public function archive(int $timeOffRequestId): JsonResponse
    {
        $user = Auth::user();

        // Only Admin and Superadmin can archive
        if (! $user->hasRole(['Admin', 'Superadmin'])) {
            return $this->forbidden('Only Admin or Superadmin can archive requests');
        }

        $timeOffRequest = TimeOffRequest::find($timeOffRequestId);

        if (! $timeOffRequest) {
            return $this->notFound('Time-off request not found');
        }

        $requestEmployee = EmployeeProfile::with('user')->find($timeOffRequest->employee_id);
        if (! $requestEmployee) {
            return $this->notFound('Employee profile not found');
        }

        $requestTenantId = $this->employeeTenantId($requestEmployee);
        if ($requestTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($requestTenantId);

        if ($timeOffRequest->archived_at) {
            return $this->error('Request is already archived', 422);
        }

        $timeOffRequest->update(['archived_at' => now()]);
        $timeOffRequest->load(['employee.user', 'requestedBy', 'approvedBy']);

        return $this->success($timeOffRequest, 'Time-off request archived successfully');
    }

    /**
     * Restore an archived time-off request (Admin/Superadmin only)
     */
    public function restore(int $timeOffRequestId): JsonResponse
    {
        $user = Auth::user();

        // Only Admin and Superadmin can restore
        if (! $user->hasRole(['Admin', 'Superadmin'])) {
            return $this->forbidden('Only Admin or Superadmin can restore requests');
        }

        $timeOffRequest = TimeOffRequest::find($timeOffRequestId);

        if (! $timeOffRequest) {
            return $this->notFound('Time-off request not found');
        }

        $requestEmployee = EmployeeProfile::with('user')->find($timeOffRequest->employee_id);
        if (! $requestEmployee) {
            return $this->notFound('Employee profile not found');
        }

        $requestTenantId = $this->employeeTenantId($requestEmployee);
        if ($requestTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        $this->assertWritableTenant($requestTenantId);

        if (! $timeOffRequest->archived_at) {
            return $this->error('Request is not archived', 422);
        }

        $timeOffRequest->update(['archived_at' => null]);
        $timeOffRequest->load(['employee.user', 'requestedBy', 'approvedBy']);

        return $this->success($timeOffRequest, 'Time-off request restored successfully');
    }

    /**
     * Check if user can view request
     */
    private function canViewRequest(TimeOffRequest $request): bool
    {
        $user = Auth::user();
        $employee = EmployeeProfile::find($request->employee_id);

        if (! $employee) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return false;
        }

        if ($user->hasRole('Admin') && $employeeTenantId === (int) $user->tenant_id) {
            return true;
        }

        if ($user->hasRole('Manager')) {
            return $employeeTenantId === (int) $user->tenant_id
                && $employee->department_id === ($user->employeeProfile->department_id ?? null);
        }

        // Own requests
        return $employee->user_id === $user->id;
    }

    /**
     * Check if user can update request
     */
    private function canUpdateRequest(TimeOffRequest $request): bool
    {
        $user = Auth::user();
        $employee = EmployeeProfile::find($request->employee_id);

        if (! $employee) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return false;
        }

        if ($user->hasRole('Admin')) {
            return $employeeTenantId === (int) $user->tenant_id;
        }

        if ($user->hasRole('Manager')) {
            return $employeeTenantId === (int) $user->tenant_id
                && $employee->department_id === ($user->employeeProfile->department_id ?? null);
        }

        // Own requests only
        return $employee->user_id === $user->id;
    }

    private function employeeTenantId(EmployeeProfile $employee): ?int
    {
        $employee->loadMissing('user');

        $tenantId = data_get($employee, 'user.tenant_id');

        return is_numeric($tenantId) ? (int) $tenantId : null;
    }
}
