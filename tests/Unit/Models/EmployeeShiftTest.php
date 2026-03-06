<?php

namespace Tests\Unit\Models;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\EmployeeShift;
use App\Models\Shift;
use App\Models\User;
use Tests\TestCase;

class EmployeeShiftTest extends TestCase
{
    public function test_is_currently_active_when_dates_are_valid(): void
    {
        [$profile, $shift] = $this->createProfileAndShift();

        $assignment = EmployeeShift::create([
            'employee_id' => $profile->id,
            'shift_id' => $shift->id,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'is_active' => true,
        ]);

        $this->assertTrue($assignment->isCurrentlyActive());
    }

    public function test_is_not_currently_active_when_disabled_or_out_of_range(): void
    {
        [$profile, $shift] = $this->createProfileAndShift();

        $inactive = EmployeeShift::create([
            'employee_id' => $profile->id,
            'shift_id' => $shift->id,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'is_active' => false,
        ]);

        $ended = EmployeeShift::create([
            'employee_id' => $profile->id,
            'shift_id' => $shift->id,
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->subDays(2)->toDateString(),
            'is_active' => true,
        ]);

        $this->assertFalse($inactive->isCurrentlyActive());
        $this->assertFalse($ended->isCurrentlyActive());
    }

    public function test_relations_return_expected_models(): void
    {
        [$profile, $shift] = $this->createProfileAndShift();

        $assignment = EmployeeShift::create([
            'employee_id' => $profile->id,
            'shift_id' => $shift->id,
            'start_date' => now()->toDateString(),
            'end_date' => null,
            'is_active' => true,
        ]);

        $this->assertEquals($profile->id, $assignment->employee->id);
        $this->assertEquals($shift->id, $assignment->shift->id);
    }

    private function createProfileAndShift(): array
    {
        $user = User::factory()->create(['tenant_id' => 1]);

        $department = Department::firstOrCreate(
            ['tenant_id' => 1, 'name' => 'Field Operations'],
            ['is_active' => true]
        );

        $profile = EmployeeProfile::create([
            'tenant_id' => 1,
            'user_id' => $user->id,
            'department_id' => $department->id,
            'position' => 'Technician',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 65,
            'availability_status' => 'available',
        ]);

        $shift = Shift::create([
            'tenant_id' => 1,
            'name' => 'Unit Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Unit test shift',
            'is_active' => true,
        ]);

        return [$profile, $shift];
    }
}
