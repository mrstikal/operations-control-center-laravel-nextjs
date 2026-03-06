<?php

namespace App\Http\Controllers\Api;

use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DepartmentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::query();

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $departments = $query
            ->orderBy('name')
            ->withCount('employees')
            ->get()
            ->map(function (Department $department) {
                $department->setAttribute('assigned_employees_count', $department->employees_count);

                return $department;
            });

        return $this->success($departments, 'Departments retrieved successfully');
    }

    public function show(int $departmentId): JsonResponse
    {
        $department = Department::find($departmentId);

        if (! $department) {
            return $this->notFound('Department not found');
        }

        $department->loadCount('employees');
        $department->setAttribute('assigned_employees_count', $department->employees_count);

        return $this->success($department, 'Department retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        if (! Auth::user()->hasRole('Superadmin')) {
            return $this->forbidden('Only Superadmin can create departments');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'description' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $department = Department::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->created($department, 'Department created successfully');
    }

    public function update(Request $request, int $departmentId): JsonResponse
    {
        if (! Auth::user()->hasRole('Superadmin')) {
            return $this->forbidden('Only Superadmin can update departments');
        }

        $department = Department::find($departmentId);
        if (! $department) {
            return $this->notFound('Department not found');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('departments', 'name')->ignore($department->id)],
            'description' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $department->update($validated);

        return $this->success($department, 'Department updated successfully');
    }

    public function destroy(Request $request, int $departmentId): JsonResponse
    {
        if (! Auth::user()->hasRole('Superadmin')) {
            return $this->forbidden('Only Superadmin can delete departments');
        }

        $department = Department::find($departmentId);
        if (! $department) {
            return $this->notFound('Department not found');
        }

        $assignedCount = $department->employees()->count();

        // If employees are assigned, check for reassignment flow.
        if ($assignedCount > 0) {
            $targetDepartmentId = $request->input('target_department_id');

            if (! $targetDepartmentId) {
                // No reassignment requested - return 409 with available departments.
                $availableDepartments = Department::query()
                    ->where('id', '!=', $department->id)
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']);

                return $this->error(
                    "Cannot delete department '{$department->name}'. {$assignedCount} employee(s) assigned. Provide target_department_id to reassign them.",
                    409,
                    [
                        'assigned_employees_count' => $assignedCount,
                        'available_departments' => $availableDepartments,
                    ]
                );
            }

            // Reassignment requested - validate target department.
            $targetDepartment = Department::where('id', $targetDepartmentId)
                ->where('is_active', true)
                ->first();

            if (! $targetDepartment) {
                return $this->error(
                    'Invalid target_department_id. Department not found or inactive.',
                    422
                );
            }

            if ($targetDepartment->id === $department->id) {
                return $this->error(
                    'Cannot reassign employees to the same department being deleted.',
                    422
                );
            }

            // Perform reassignment using relation.
            $updated = $department->employees()->update([
                'department_id' => $targetDepartment->id,
                'updated_at' => now(),
            ]);

            $department->delete();

            return $this->success(
                [
                    'reassigned_count' => $updated,
                    'target_department' => $targetDepartment->name,
                ],
                "Department '{$department->name}' deleted. {$updated} employee(s) reassigned to '{$targetDepartment->name}'."
            );
        }

        // No employees assigned - simple delete.
        $department->delete();

        return $this->success(null, 'Department deleted successfully');
    }
}
