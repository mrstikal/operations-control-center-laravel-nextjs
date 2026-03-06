<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * EmployeeController - RBAC-aware Employee Management
 */
class EmployeeController extends BaseApiController
{
    /**
     * Display a listing of employees
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $statusFilter = (string) $request->get('status', '');
        $deletedView = $statusFilter === 'deleted';

        $query = EmployeeProfile::query()
            ->with(['user.tenant', 'department']);

        if ($deletedView) {
            $query->onlyTrashed();
        }

        // RBAC filtering
        if ($user->hasRole('Superadmin')) {
            if ($request->has('tenant_id')) {
                $query->whereHas('user', function ($q) use ($request) {
                    $q->where('tenant_id', $request->tenant_id);
                });
            }
        } elseif ($user->hasRole('Admin')) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
        } elseif ($user->hasRole('Manager')) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            })->where('department_id', $user->employeeProfile->department_id ?? null);
        } else {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
            if (! $deletedView) {
                $query->where('availability_status', 'available');
            }
        }

        // Filters
        if ($request->filled('department')) {
            $query->whereHas('department', function ($q) use ($request) {
                $q->where('name', $request->department);
            });
        }

        if ($request->filled('status') && $statusFilter !== 'deleted') {
            $query->where('availability_status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Sorting – whitelist column names to prevent SQL injection via column name
        $allowedSortColumns = ['id', 'name', 'availability_status', 'position', 'created_at'];
        $allowedSortOrders = ['asc', 'desc'];

        $sortBy = in_array($request->get('sort_by'), $allowedSortColumns, true)
            ? $request->get('sort_by')
            : 'id';
        $sortOrder = in_array(strtolower((string) $request->get('sort_order')), $allowedSortOrders, true)
            ? strtolower((string) $request->get('sort_order'))
            : 'desc';

        if ($sortBy === 'name') {
            $query->join('users', 'employee_profiles.user_id', '=', 'users.id')
                ->select('employee_profiles.*')
                ->orderBy('users.name', $sortOrder);
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        $perPage = $request->get('per_page', 20);
        $employees = $query->paginate($perPage);

        // Backward-compatible field for frontend table column.
        $employees->getCollection()->transform(function (EmployeeProfile $employee) {
            $tenantId = data_get($employee, 'user.tenant_id');
            $tenantModel = data_get($employee, 'user.tenant');

            $employee->setAttribute('department', data_get($employee->department, 'name'));
            $employee->setAttribute('tenant_id', is_numeric($tenantId) ? (int) $tenantId : null);
            $employee->setAttribute('tenant', $tenantModel ? [
                'id' => data_get($tenantModel, 'id'),
                'name' => data_get($tenantModel, 'name'),
            ] : null);

            return $employee;
        });

        return $this->paginated($employees, 'Employees retrieved successfully');
    }

    /**
     * Display the specified employee
     */
    public function show(int $employeeId): JsonResponse
    {
        $user = Auth::user();

        $employee = EmployeeProfile::withTrashed()->with([
            'user.tenant',
            'department',
            'shifts.shift',
            'timeOffRequests' => function ($q) {
                $q->orderBy('start_date', 'desc')->limit(10);
            },
            'workload' => function ($q) {
                $q->orderBy('work_date', 'desc')->limit(30);
            },
        ])->find($employeeId);

        if (! $employee) {
            return $this->notFound('Employee not found');
        }

        // RBAC check
        if (! $this->canViewEmployee($employee)) {
            return $this->forbidden('You do not have permission to view this employee');
        }

        // Calculate current week workload
        $thisWeekWorkload = $employee->workload()
            ->whereBetween('work_date', [now()->startOfWeek(), now()->endOfWeek()])
            ->sum('hours_allocated');

        // Get current shift
        $currentShift = $employee->getCurrentShift();

        $data = $employee->toArray();
        $data['current_shift'] = $currentShift;
        $data['this_week_hours'] = $thisWeekWorkload;
        $data['pending_timeoff'] = $employee->timeOffRequests()
            ->where('status', 'pending')
            ->count();
        $tenantId = data_get($employee, 'user.tenant_id');
        $tenantModel = data_get($employee, 'user.tenant');
        $data['tenant_id'] = is_numeric($tenantId) ? (int) $tenantId : null;
        $data['tenant'] = $tenantModel ? [
            'id' => data_get($tenantModel, 'id'),
            'name' => data_get($tenantModel, 'name'),
        ] : null;

        return $this->success($data, 'Employee retrieved successfully');
    }

    /**
     * Store a newly created employee
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Create can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can create employees');
        }

        // Permission check
        if (! $user->hasPermissionTo('hr.view_employees')) {
            return $this->forbidden('You do not have permission to create employees');
        }

        $tenantId = $this->assertWritableTenant();

        // Superadmin may explicitly specify the target tenant via body parameter.
        if ($user->hasRole('Superadmin') && $request->filled('tenant_id')) {
            $tenantId = (int) $request->tenant_id;
        }

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create employees for archived tenant', 422);
        }

        $validated = $request->validate([
            // User fields (optional - if provided, create new user)
            'name' => 'required_without:user_id|string|max:255',
            'email' => 'required_without:user_id|email|unique:users,email',
            'phone' => 'nullable|string|max:50',
            'bio' => 'nullable|string|max:500',

            // Tenant (Superadmin only – validated above before reaching this point)
            'tenant_id' => 'nullable|exists:tenants,id',

            // Employee profile fields
            'user_id' => 'required_without:email|exists:users,id|unique:employee_profiles,user_id',
            'department' => 'required_without:department_id|string|max:255',
            'department_id' => 'required_without:department|exists:departments,id',
            'position' => 'required|string|max:255',
            'hire_date' => 'nullable|date',
            'available_hours_per_week' => 'nullable|integer|min:1|max:168',
            'skills' => 'nullable|array',
            'certifications' => 'nullable|array',
        ]);

        // If email provided, create new user first
        if (isset($validated['email'])) {
            $newUser = User::create([
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'password' => bcrypt('temp_password_'.time()),
                'status' => 'active',
            ]);

            $validated['user_id'] = $newUser->id;
        }

        // Resolve department_id if department name provided
        if (isset($validated['department']) && ! isset($validated['department_id'])) {
            $department = \App\Models\Department::firstOrCreate(
                ['name' => $validated['department']],
                ['is_active' => true]
            );
            $validated['department_id'] = $department->id;
        }

        $targetUser = User::findOrFail($validated['user_id']);
        if ((int) $targetUser->tenant_id !== $tenantId) {
            return $this->error('Employee user must belong to the selected tenant', 422);
        }

        if ($user->hasRole('Manager') && $validated['department_id'] !== ($user->employeeProfile->department_id ?? null)) {
            return $this->forbidden('You can only create employees in your department');
        }

        $validated['availability_status'] = 'available';

        $employee = EmployeeProfile::create([
            'user_id' => $validated['user_id'],
            'department_id' => $validated['department_id'],
            'position' => $validated['position'],
            'hire_date' => $validated['hire_date'] ?? null,
            'available_hours_per_week' => $validated['available_hours_per_week'] ?? 40,
            'skills' => $validated['skills'] ?? null,
            'certifications' => $validated['certifications'] ?? null,
            'availability_status' => $validated['availability_status'],
        ]);

        $employee->load('user', 'department');

        return $this->created($employee, 'Employee created successfully');
    }

    /**
     * Update the specified employee
     */
    public function update(Request $request, int $employeeId): JsonResponse
    {
        $user = Auth::user();
        $employee = EmployeeProfile::with('user')->find($employeeId);

        if (! $employee) {
            return $this->notFound('Employee not found');
        }

        // Edit can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can edit employees');
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        if ($user->hasRole('Admin') && $employeeTenantId !== (int) $user->tenant_id) {
            return $this->forbidden('You can only update employees in your tenant');
        }

        // RBAC: Manager can only update own department in own tenant.
        if ($user->hasRole('Manager')) {
            if (
                $employeeTenantId !== (int) $user->tenant_id
                || $employee->department_id !== ($user->employeeProfile->department_id ?? null)
            ) {
                return $this->forbidden('You can only update employees in your department');
            }
        }

        $this->assertWritableTenant($employeeTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($employeeTenantId)) {
            return $this->error('Cannot update employees for archived tenant', 422);
        }

        $validated = $request->validate([
            'department_id' => 'sometimes|required|exists:departments,id',
            'position' => 'sometimes|required|string|max:255',
            'hire_date' => 'nullable|date',
            'available_hours_per_week' => 'nullable|integer|min:1|max:168',
            'utilization_percent' => 'nullable|numeric|min:0|max:100',
            'skills' => 'nullable|array',
            'certifications' => 'nullable|array',
            'availability_status' => ['nullable', Rule::in(['available', 'on_leave', 'on_maintenance', 'unavailable'])],
            'availability_until' => 'nullable|date',
            'tenant_id' => 'sometimes|nullable|exists:tenants,id',
        ]);

        $targetTenantId = (int) ($validated['tenant_id'] ?? $employeeTenantId);

        $this->assertWritableTenant($targetTenantId);

        // Check if target tenant is archived
        if (! $this->checkArchivedTenantForWrite($targetTenantId)) {
            return $this->error('Cannot update employees for archived tenant', 422);
        }

        // Superadmin can reassign employee to another tenant.
        if ($user->hasRole('Superadmin') && isset($validated['tenant_id'])) {
            DB::transaction(function () use ($employee, $validated) {
                $employee->user->update(['tenant_id' => $validated['tenant_id']]);
            });
        }
        unset($validated['tenant_id']);

        $employee->update($validated);

        $employee->load('user', 'department');

        return $this->success($employee, 'Employee updated successfully');
    }

    /**
     * Remove the specified employee (soft delete)
     */
    public function destroy(int $employeeId): JsonResponse
    {
        $user = Auth::user();

        // Delete can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can delete employees');
        }

        $employee = EmployeeProfile::withTrashed()->with('user')->find($employeeId);

        if (! $employee) {
            return $this->notFound('Employee not found');
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        if ($user->hasRole('Admin') && $employeeTenantId !== (int) $user->tenant_id) {
            return $this->forbidden('You can only delete employees from your tenant');
        }

        if ($user->hasRole('Manager')) {
            if (
                $employeeTenantId !== (int) $user->tenant_id
                || $employee->department_id !== ($user->employeeProfile->department_id ?? null)
            ) {
                return $this->forbidden('You can only delete employees in your department');
            }
        }

        $this->assertWritableTenant($employeeTenantId);

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($employeeTenantId)) {
            return $this->error('Cannot delete employees for archived tenant', 422);
        }

        if ($employee->trashed()) {
            return $this->error('Employee is already soft-deleted', 422);
        }

        $employee->delete();

        return $this->success(null, 'Employee deleted successfully');
    }

    /**
     * Restore soft-deleted employee
     */
    public function restore(int $employeeId): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['Superadmin', 'Admin'])) {
            return $this->forbidden('You do not have permission to restore employees');
        }

        $employee = EmployeeProfile::withTrashed()->with('user')->find($employeeId);

        if (! $employee) {
            return $this->notFound('Employee not found');
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        if ($user->hasRole('Admin') && $employeeTenantId !== (int) $user->tenant_id) {
            return $this->forbidden('You can only restore employees from your tenant');
        }

        $this->assertWritableTenant($employeeTenantId);

        if (! $employee->trashed()) {
            return $this->error('Restore is allowed only for soft-deleted employees', 422);
        }

        $employee->restore();
        $employee->load('user', 'department');

        return $this->success($employee, 'Employee restored successfully');
    }

    /**
     * Permanently delete soft-deleted employee
     */
    public function hardDelete(int $employeeId): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['Superadmin', 'Admin'])) {
            return $this->forbidden('You do not have permission to permanently delete employees');
        }

        $employee = EmployeeProfile::withTrashed()->with('user')->find($employeeId);

        if (! $employee) {
            return $this->notFound('Employee not found');
        }

        $employeeTenantId = $this->employeeTenantId($employee);
        if ($employeeTenantId === null) {
            return $this->error('Employee tenant context could not be resolved', 422);
        }

        if ($user->hasRole('Admin') && $employeeTenantId !== (int) $user->tenant_id) {
            return $this->forbidden('You can only permanently delete employees from your tenant');
        }

        $this->assertWritableTenant($employeeTenantId);

        if (! $employee->trashed()) {
            return $this->error('Hard delete is allowed only after soft delete', 422);
        }

        $employee->forceDelete();

        return $this->success(null, 'Employee permanently deleted successfully');
    }

    /**
     * Get employee statistics
     */
    public function statistics(): JsonResponse
    {
        $user = Auth::user();
        $query = EmployeeProfile::query();

        // Apply tenant filtering
        if ($user->hasRole('Superadmin')) {
            // See all
        } elseif ($user->hasRole('Admin')) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
        } elseif ($user->hasRole('Manager')) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            })->where('department_id', $user->employeeProfile->department_id ?? null);
        } else {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
        }

        $stats = [
            'total' => $query->count(),
            'by_status' => $query->select('availability_status', DB::raw('count(*) as count'))
                ->groupBy('availability_status')
                ->pluck('count', 'availability_status'),
            'by_department' => $query->select('department_id', DB::raw('count(*) as count'))
                ->groupBy('department_id')
                ->pluck('count', 'department_id'),
            'avg_utilization' => round($query->avg('utilization_percent'), 2),
        ];

        return $this->success($stats, 'Employee statistics retrieved');
    }

    /**
     * Check if user can view specific employee
     */
    private function canViewEmployee(EmployeeProfile $employee): bool
    {
        $user = Auth::user();

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

        // Technician/Viewer can view employees in same tenant
        return $employeeTenantId === (int) $user->tenant_id;
    }

    private function employeeTenantId(EmployeeProfile $employee): ?int
    {
        $employee->loadMissing('user');

        $tenantId = data_get($employee, 'user.tenant_id');

        return is_numeric($tenantId) ? (int) $tenantId : null;
    }
}
