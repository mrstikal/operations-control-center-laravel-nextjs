<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\EmployeeShift;
use App\Models\Role;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class ShiftApiTest extends TestCase
{
    protected Tenant $tenant;

    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::findOrFail(1);

        $this->admin = $this->createUserWithRole('Admin');
        $this->manager = $this->createUserWithRole('Manager');
        $this->technician = $this->createUserWithRole('Technician');
        $this->superadmin = $this->createUserWithRole('Superadmin');
    }

    public function test_manager_can_create_shift(): void
    {
        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/shifts', [
                'name' => 'Night Shift',
                'start_time' => '22:00',
                'end_time' => '23:59',
                'days_of_week' => [1, 2, 3, 4, 5],
                'description' => 'Night coverage',
                'is_active' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Night Shift');

        $this->assertDatabaseHas('shifts', [
            'name' => 'Night Shift',
        ]);
    }

    public function test_all_roles_can_view_shifts(): void
    {
        Shift::create([
            'name' => 'Day Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Standard',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->getJson('/api/shifts');

        $response->assertStatus(200);
    }

    public function test_can_view_shift_detail(): void
    {
        $shift = Shift::create([
            'name' => 'Detail Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $this->actingAs($this->technician, 'web')
            ->getJson('/api/shifts/'.$shift->id)
            ->assertStatus(200)
            ->assertJsonPath('data.id', $shift->id)
            ->assertJsonPath('data.name', 'Detail Shift');
    }

    public function test_technician_cannot_create_shift(): void
    {
        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/shifts', [
                'name' => 'Should Not Create',
                'start_time' => '09:00',
                'end_time' => '17:00',
                'days_of_week' => [1, 2, 3, 4, 5],
            ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_edit_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Edit Test Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->putJson("/api/shifts/{$shift->id}", [
                'name' => 'Should Not Edit',
            ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_delete_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Delete Test Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->deleteJson("/api/shifts/{$shift->id}");

        $response->assertStatus(403);
    }

    public function test_manager_can_edit_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Edit By Manager Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->putJson("/api/shifts/{$shift->id}", [
                'name' => 'Edited By Manager',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Edited By Manager');
    }

    public function test_manager_can_delete_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Manager Delete Test Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->deleteJson("/api/shifts/{$shift->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('shifts', ['id' => $shift->id]);
    }

    public function test_admin_can_delete_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Admin Delete Test Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/shifts/{$shift->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('shifts', ['id' => $shift->id]);
    }

    public function test_manager_can_assign_employees_to_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Assignment Test Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employee1 = $this->createEmployee('assign-emp1@tests.local');
        $employee2 = $this->createEmployee('assign-emp2@tests.local');

        $response = $this->actingAs($this->manager, 'web')
            ->postJson("/api/shifts/{$shift->id}/assign", [
                'employee_ids' => [$employee1->id, $employee2->id],
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonth()->toDateString(),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('employee_shifts', [
            'employee_id' => $employee1->id,
            'shift_id' => $shift->id,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('employee_shifts', [
            'employee_id' => $employee2->id,
            'shift_id' => $shift->id,
            'is_active' => true,
        ]);
    }

    public function test_technician_cannot_assign_employees_to_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Tech Assign Test Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employee = $this->createEmployee('tech-assign@tests.local');

        $response = $this->actingAs($this->technician, 'web')
            ->postJson("/api/shifts/{$shift->id}/assign", [
                'employee_ids' => [$employee->id],
                'start_date' => now()->toDateString(),
            ]);

        $response->assertStatus(403);
    }

    public function test_manager_can_remove_employee_assignment_from_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Remove Assignment Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employee = $this->createEmployee('remove-assignment@tests.local');

        $assignment = EmployeeShift::create([
            'employee_id' => $employee->id,
            'shift_id' => $shift->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->deleteJson("/api/employee-shifts/{$assignment->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('employee_shifts', ['id' => $assignment->id]);
    }

    public function test_manager_cannot_assign_employees_to_shift_from_other_tenant(): void
    {
        $foreignShift = Shift::create([
            'name' => 'Foreign Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employee = $this->createEmployee('foreign-shift-employee@tests.local');

        $this->actingAs($this->manager, 'web')
            ->postJson("/api/shifts/{$foreignShift->id}/assign", [
                'employee_ids' => [$employee->id],
                'start_date' => now()->toDateString(),
            ])
            ->assertStatus(201);
    }

    public function test_manager_cannot_assign_employee_from_other_tenant(): void
    {
        $shift = Shift::create([
            'tenant_id' => 1,
            'name' => 'Local Shift For Tenant Guard',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $foreignUser = User::factory()->create([
            'tenant_id' => 999,
            'email' => 'foreign-employee@tests.local',
            'status' => 'active',
        ]);

        $foreignEmployee = EmployeeProfile::create([
            'user_id' => $foreignUser->id,
            'department_id' => $this->resolveDepartmentId(999, 'Foreign Operations'),
            'position' => 'Technician',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 70,
            'availability_status' => 'available',
        ]);

        $this->actingAs($this->manager, 'web')
            ->postJson("/api/shifts/{$shift->id}/assign", [
                'employee_ids' => [$foreignEmployee->id],
                'start_date' => now()->toDateString(),
            ])
            ->assertStatus(422);
    }

    public function test_technician_cannot_remove_employee_assignment_from_shift(): void
    {
        $shift = Shift::create([
            'name' => 'Blocked Remove Assignment Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employee = $this->createEmployee('blocked-remove-assignment@tests.local');

        $assignment = EmployeeShift::create([
            'employee_id' => $employee->id,
            'shift_id' => $shift->id,
            'start_date' => now()->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->deleteJson("/api/employee-shifts/{$assignment->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('employee_shifts', ['id' => $assignment->id]);
    }

    public function test_can_filter_employee_shifts_by_employee_id(): void
    {
        $shift = Shift::create([
            'name' => 'Filter Assignment Shift',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'is_active' => true,
        ]);

        $employeeA = $this->createEmployee('filter-a@tests.local');
        $employeeB = $this->createEmployee('filter-b@tests.local');

        EmployeeShift::create([
            'employee_id' => $employeeA->id,
            'shift_id' => $shift->id,
            'start_date' => now()->toDateString(),
            'is_active' => true,
        ]);

        EmployeeShift::create([
            'employee_id' => $employeeB->id,
            'shift_id' => $shift->id,
            'start_date' => now()->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->getJson('/api/employee-shifts?employee_id='.$employeeA->id);

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.employee_id', $employeeA->id);
    }

    private function createUserWithRole(string $roleName): User
    {
        $user = User::factory()->create(['tenant_id' => 1, 'status' => 'active']);
        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->sync([$role->id]);

        EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId(1, 'Operations Control'),
            'position' => $roleName.' User',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => 40,
            'utilization_percent' => 65,
            'availability_status' => 'available',
        ]);

        return $user;
    }

    private function createEmployee(string $email): EmployeeProfile
    {
        $user = User::factory()->create([
            'tenant_id' => 1,
            'email' => $email,
            'status' => 'active',
        ]);

        return EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId(1, 'Field Operations'),
            'position' => 'Technician',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 70,
            'availability_status' => 'available',
        ]);
    }

    private function resolveDepartmentId(int $tenantId, string $name): int
    {
        $department = Department::firstOrCreate(
            ['name' => $name],
            ['is_active' => true]
        );

        return (int) $department->id;
    }
}
