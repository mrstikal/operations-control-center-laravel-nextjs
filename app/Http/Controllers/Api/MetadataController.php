<?php

namespace App\Http\Controllers\Api;

use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MetadataController extends BaseApiController
{
    /**
     * Get all HR metadata (departments, statuses, types)
     */
    public function hrMetadata(): JsonResponse
    {
        $departments = $this->resolveDepartments();

        $availabilityStatuses = [
            ['label' => 'Available', 'value' => 'available'],
            ['label' => 'On Leave', 'value' => 'on_leave'],
            ['label' => 'On Maintenance', 'value' => 'on_maintenance'],
            ['label' => 'Unavailable', 'value' => 'unavailable'],
        ];

        $timeOffTypes = [
            ['label' => 'Vacation', 'value' => 'vacation'],
            ['label' => 'Sick Leave', 'value' => 'sick_leave'],
            ['label' => 'Personal', 'value' => 'personal'],
            ['label' => 'Other', 'value' => 'other'],
        ];

        $timeOffStatuses = [
            ['label' => 'Pending', 'value' => 'pending'],
            ['label' => 'Approved', 'value' => 'approved'],
            ['label' => 'Rejected', 'value' => 'rejected'],
            ['label' => 'Cancelled', 'value' => 'cancelled'],
        ];

        return $this->success([
            'departments' => $departments,
            'availability_statuses' => $availabilityStatuses,
            'time_off_types' => $timeOffTypes,
            'time_off_statuses' => $timeOffStatuses,
        ], 'HR metadata retrieved successfully');
    }

    /**
     * Get distinct departments from database
     */
    public function departments(): JsonResponse
    {
        $departments = $this->resolveDepartments();

        return $this->success($departments, 'Departments retrieved successfully');
    }

    /**
     * Get distinct positions from database
     */
    public function positions(): JsonResponse
    {
        $positions = DB::table('employee_profiles')
            ->whereNotNull('position')
            ->distinct()
            ->pluck('position')
            ->sort()
            ->values();

        return $this->success($positions, 'Positions retrieved successfully');
    }

    private function resolveDepartments()
    {
        return Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->values();
    }
}
