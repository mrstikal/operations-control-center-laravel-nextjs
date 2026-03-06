<?php

namespace Tests\Unit\Models;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeProfileTest extends TestCase
{
    public function test_scopes_filter_by_department_and_availability(): void
    {
        $ops = $this->createProfile('ops-scope@tests.local', 'Operations Control', 'available');
        $field = $this->createProfile('field-scope@tests.local', 'Field Operations', 'on_leave');

        $this->assertEquals(1, EmployeeProfile::byDepartment('Operations Control')->count());
        $this->assertEquals([$ops->id], EmployeeProfile::available()->pluck('id')->all());
        $this->assertNotContains($field->id, EmployeeProfile::available()->pluck('id')->all());
    }

    public function test_availability_state_methods_work(): void
    {
        $profile = $this->createProfile('availability@tests.local', 'Field Operations', 'available');

        $this->assertTrue($profile->isAvailable());

        $until = now()->addDays(3);
        $profile->setOnLeave($until);
        $profile->refresh();

        $this->assertEquals('on_leave', $profile->availability_status);
        $this->assertFalse($profile->isAvailable());

        $profile->setAvailable();
        $profile->refresh();

        $this->assertEquals('available', $profile->availability_status);
        $this->assertNull($profile->availability_until);
    }

    public function test_get_current_shift_returns_active_assignment(): void
    {
        $profile = $this->createProfile('current-shift@tests.local', 'Operations Control', 'available');

        $oldShift = Shift::create([
            'name' => 'Old Shift',
            'start_time' => '06:00',
            'end_time' => '14:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Old assignment',
            'is_active' => true,
        ]);

        $currentShift = Shift::create([
            'name' => 'Current Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Current assignment',
            'is_active' => true,
        ]);

        DB::table('employee_shifts')->insert([
            [
                'employee_id' => $profile->id,
                'shift_id' => $oldShift->id,
                'start_date' => now()->subMonths(2)->toDateString(),
                'end_date' => now()->subMonth()->toDateString(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'employee_id' => $profile->id,
                'shift_id' => $currentShift->id,
                'start_date' => now()->subDays(10)->toDateString(),
                'end_date' => null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $assignment = $profile->getCurrentShift();

        $this->assertNotNull($assignment);
        $this->assertEquals($currentShift->id, $assignment->shift_id);
    }

    private function createProfile(string $email, string $departmentName, string $availability): EmployeeProfile
    {
        $user = User::factory()->create(['tenant_id' => 1, 'email' => $email]);
        $viewer = Role::where('name', 'Viewer')->first();
        if ($viewer) {
            $user->roles()->sync([$viewer->id]);
        }

        $department = Department::firstOrCreate(
            ['name' => $departmentName],
            ['is_active' => true]
        );

        return EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'position' => 'Unit Test Position',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 50,
            'availability_status' => $availability,
        ]);
    }
}
