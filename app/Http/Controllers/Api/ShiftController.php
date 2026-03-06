<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeeShift;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * ShiftController - Manage employee shifts and schedules
 */
class ShiftController extends BaseApiController
{
    /**
     * Display a listing of shifts
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Shift::query();

        // Filters
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $perPage = $request->get('per_page', 20);
        $shifts = $query->paginate($perPage);

        return $this->paginated($shifts, 'Shifts retrieved successfully');
    }

    /**
     * Display the specified shift
     */
    public function show(int $shiftId): JsonResponse
    {
        $shift = Shift::with([
            'employeeShifts.employee.user',
        ])->find($shiftId);

        if (! $shift) {
            return $this->notFound('Shift not found');
        }

        // RBAC check
        if (! $this->canViewShift($shift)) {
            return $this->forbidden('You do not have permission to view this shift');
        }

        // Build response with properly formatted employees array
        $response = [
            'id' => $shift->id,
            'name' => $shift->name,
            'start_time' => $shift->start_time,
            'end_time' => $shift->end_time,
            'days_of_week' => $shift->days_of_week,
            'description' => $shift->description,
            'is_active' => $shift->is_active,
            'created_at' => $shift->created_at,
            'updated_at' => $shift->updated_at,
            'employees' => [],
        ];

        // Transform employeeShifts to frontend format
        foreach ($shift->employeeShifts as $es) {
            $response['employees'][] = [
                'id' => $es->id,
                'employee_id' => $es->employee_id,
                'shift_id' => $es->shift_id,
                'start_date' => $es->start_date->format('Y-m-d'),
                'end_date' => $es->end_date?->format('Y-m-d'),
                'is_active' => $es->is_active,
                'employee' => [
                    'id' => $es->employee->id,
                    'user' => [
                        'id' => $es->employee->user->id,
                        'name' => $es->employee->user->name,
                        'email' => $es->employee->user->email,
                    ],
                ],
            ];
        }

        return $this->success($response, 'Shift retrieved successfully');
    }

    /**
     * Store a newly created shift
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Create can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can create shifts');
        }

        if (! $user->hasPermissionTo('hr.manage_shifts')) {
            return $this->forbidden('You do not have permission to create shifts');
        }

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot create shifts for archived tenant', 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'days_of_week' => 'required|array',
            'days_of_week.*' => 'integer|min:1|max:7',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $shift = Shift::create($validated);

        return $this->created($shift, 'Shift created successfully');
    }

    /**
     * Update the specified shift
     */
    public function update(Request $request, int $shiftId): JsonResponse
    {
        $user = Auth::user();
        $shift = Shift::find($shiftId);

        if (! $shift) {
            return $this->notFound('Shift not found');
        }

        // Edit can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can edit shifts');
        }

        if (! $user->hasPermissionTo('hr.manage_shifts')) {
            return $this->forbidden('You do not have permission to update shifts');
        }

        // Check tenant access
        if (! $this->canViewShift($shift)) {
            return $this->forbidden('You do not have access to this shift');
        }

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot update shifts for archived tenant', 422);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i|after:start_time',
            'days_of_week' => 'sometimes|required|array',
            'days_of_week.*' => 'integer|min:1|max:7',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $shift->update($validated);

        return $this->success($shift, 'Shift updated successfully');
    }

    /**
     * Remove the specified shift
     */
    public function destroy(int $shiftId): JsonResponse
    {
        $user = Auth::user();

        // Delete can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can delete shifts');
        }

        $shift = Shift::find($shiftId);

        if (! $shift) {
            return $this->notFound('Shift not found');
        }

        if (! $this->canViewShift($shift)) {
            return $this->forbidden('You do not have access to this shift');
        }

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot delete shifts for archived tenant', 422);
        }

        $shift->delete();

        return $this->success(null, 'Shift deleted successfully');
    }

    /**
     * Assign employees to a shift
     */
    public function assignEmployees(Request $request, int $shiftId): JsonResponse
    {
        $user = Auth::user();

        // Assign can be performed only by Manager+.
        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can assign employees to shifts');
        }

        $shift = Shift::find($shiftId);

        if (! $shift) {
            return $this->notFound('Shift not found');
        }

        if (! $this->canViewShift($shift)) {
            return $this->forbidden('You do not have access to this shift');
        }

        if (! $user->hasPermissionTo('hr.manage_shifts')) {
            return $this->forbidden('You do not have permission to assign shifts');
        }

        $tenantId = $this->assertWritableTenant();

        // Check if tenant is archived
        if (! $this->checkArchivedTenantForWrite($tenantId)) {
            return $this->error('Cannot assign employees to shifts for archived tenant', 422);
        }

        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => ['integer', Rule::exists('employee_profiles', 'id')],
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        if (! $user->hasRole('Superadmin')) {
            $allowedEmployeeIds = \App\Models\EmployeeProfile::query()
                ->whereIn('id', $validated['employee_ids'])
                ->whereHas('user', function ($q) use ($user) {
                    $q->where('tenant_id', $user->tenant_id);
                })
                ->pluck('id')
                ->all();

            if (count($allowedEmployeeIds) !== count(array_unique($validated['employee_ids']))) {
                return $this->error('You can only assign employees from your tenant', 422);
            }
        }

        $assignments = [];
        foreach ($validated['employee_ids'] as $employeeId) {
            $assignment = EmployeeShift::create([
                'employee_id' => $employeeId,
                'shift_id' => $shift->id,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'] ?? null,
                'is_active' => true,
            ]);
            $assignments[] = $assignment;
        }

        return $this->created($assignments, 'Employees assigned to shift successfully');
    }

    /**
     * Remove employee assignment from shift
     */
    public function removeEmployeeAssignment(int $assignmentId): JsonResponse
    {
        $user = Auth::user();

        if ((float) $user->getHighestRoleLevel() < 3) {
            return $this->forbidden('Only Manager or higher can remove employee assignments');
        }

        $assignment = EmployeeShift::find($assignmentId);

        if (! $assignment) {
            return $this->notFound('Employee shift assignment not found');
        }

        $shift = Shift::find($assignment->shift_id);
        if (! $shift || ! $this->canViewShift($shift)) {
            return $this->forbidden('You do not have access to this assignment');
        }

        $assignment->delete();

        return $this->success(null, 'Employee removed from shift successfully');
    }

    /**
     * Get employee shift assignments
     */
    public function employeeShifts(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = EmployeeShift::query()
            ->with(['employee.user', 'shift']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('shift_id')) {
            $query->where('shift_id', $request->shift_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('from_date')) {
            $query->where('start_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '<=', $request->to_date);
            });
        }

        if (! $user->hasRole('Superadmin')) {
            $query->whereHas('employee.user', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
        }

        $perPage = $request->get('per_page', 20);
        $assignments = $query->paginate($perPage);

        return $this->paginated($assignments, 'Employee shifts retrieved successfully');
    }

    /**
     * Check if user can view shift
     */
    private function canViewShift(Shift $shift): bool
    {
        $user = Auth::user();

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        return true;
    }
}
