<?php

namespace Tests\Unit\Models;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\Workload;
use Tests\TestCase;

class WorkloadTest extends TestCase
{
    public function test_date_range_and_overutilized_scopes(): void
    {
        $employee = $this->createEmployee(40);

        Workload::create([
            'employee_id' => $employee->id,
            'work_date' => now()->subDays(3)->toDateString(),
            'hours_allocated' => 8,
            'hours_actual' => 8.2,
            'capacity_utilization' => 100,
            'tasks' => ['focus' => 'Normal load'],
        ]);

        Workload::create([
            'employee_id' => $employee->id,
            'work_date' => now()->subDay()->toDateString(),
            'hours_allocated' => 9,
            'hours_actual' => 9.5,
            'capacity_utilization' => 112.5,
            'tasks' => ['focus' => 'Overload'],
        ]);

        $rangeCount = Workload::dateRange(now()->subDays(2)->toDateString(), now()->toDateString())->count();
        $overCount = Workload::overutilized()->count();

        $this->assertEquals(1, $rangeCount);
        $this->assertEquals(1, $overCount);
    }

    public function test_calculate_utilization_uses_employee_capacity(): void
    {
        $employee = $this->createEmployee(40);

        $workload = Workload::create([
            'employee_id' => $employee->id,
            'work_date' => now()->toDateString(),
            'hours_allocated' => 8,
            'hours_actual' => 8,
            'capacity_utilization' => 100,
            'tasks' => ['focus' => 'Capacity check'],
        ]);

        $utilization = $workload->calculateUtilization();

        // 40h/week => 8h/day, allocated 8h => 100%
        $this->assertEqualsWithDelta(100.0, $utilization, 0.01);
    }

    private function createEmployee(int $hoursPerWeek): EmployeeProfile
    {
        $user = User::factory()->create(['tenant_id' => 1]);

        $department = Department::firstOrCreate(
            ['name' => 'Technical Services'],
            ['is_active' => true]
        );

        return EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'position' => 'Engineer',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => $hoursPerWeek,
            'utilization_percent' => 0,
            'availability_status' => 'available',
        ]);
    }
}
