<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class DepartmentApiTest extends TestCase
{
    protected User $superadmin;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = $this->createUserWithRole('Superadmin');
        $this->admin = $this->createUserWithRole('Admin');
    }

    public function test_can_list_departments(): void
    {
        Department::create([
            'name' => 'Operations Control',
            'is_active' => true,
        ]);

        $this->actingAs($this->admin, 'web');

        $response = $this->getJson('/api/departments');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data']);
    }

    public function test_only_superadmin_can_create_department(): void
    {
        $this->actingAs($this->admin, 'web');
        $forbidden = $this->postJson('/api/departments', [
            'name' => 'Compliance',
        ]);
        $forbidden->assertStatus(403);

        $this->actingAs($this->superadmin, 'web');
        $allowed = $this->postJson('/api/departments', [
            'name' => 'Compliance',
            'description' => 'Regulatory and compliance',
        ]);

        $allowed->assertStatus(201)
            ->assertJsonPath('data.name', 'Compliance');

        $this->assertDatabaseHas('departments', [
            'name' => 'Compliance',
        ]);
    }

    public function test_superadmin_can_rename_department(): void
    {
        $department = Department::create([
            'name' => 'Emergency Services',
            'is_active' => true,
        ]);

        $employee = $this->createEmployeeWithDepartment($department->id);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->putJson('/api/departments/'.$department->id, [
            'name' => 'Emergency Response',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Emergency Response');

        // Employee still linked via department_id (foreign key)
        $this->assertDatabaseHas('employee_profiles', [
            'id' => $employee->id,
            'department_id' => $department->id,
        ]);
    }

    public function test_delete_department_is_blocked_when_assigned_employees_exist(): void
    {
        $department = Department::create([
            'name' => 'Technical Services',
            'is_active' => true,
        ]);

        $this->createEmployeeWithDepartment($department->id);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->deleteJson('/api/departments/'.$department->id);

        $response->assertStatus(409);
        $this->assertDatabaseHas('departments', ['id' => $department->id]);
    }

    public function test_delete_department_works_when_no_employees_assigned(): void
    {
        $department = Department::create([
            'name' => 'Temporary Unit',
            'is_active' => true,
        ]);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->deleteJson('/api/departments/'.$department->id);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('departments', ['id' => $department->id]);
    }

    public function test_delete_with_reassignment_moves_employees_to_target_department(): void
    {
        $sourceDept = Department::create([
            'name' => 'Legacy Services',
            'is_active' => true,
        ]);

        $targetDept = Department::create([
            'name' => 'Modern Operations',
            'is_active' => true,
        ]);

        $employee1 = $this->createEmployeeWithDepartment($sourceDept->id);
        $employee2 = $this->createEmployeeWithDepartment($sourceDept->id);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->deleteJson('/api/departments/'.$sourceDept->id, [
            'target_department_id' => $targetDept->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.reassigned_count', 2)
            ->assertJsonPath('data.target_department', 'Modern Operations');

        $this->assertDatabaseMissing('departments', ['id' => $sourceDept->id]);

        $this->assertDatabaseHas('employee_profiles', [
            'id' => $employee1->id,
            'department_id' => $targetDept->id,
        ]);

        $this->assertDatabaseHas('employee_profiles', [
            'id' => $employee2->id,
            'department_id' => $targetDept->id,
        ]);
    }

    public function test_delete_with_invalid_target_department_returns_422(): void
    {
        $department = Department::create([
            'name' => 'Test Department',
            'is_active' => true,
        ]);

        $this->createEmployeeWithDepartment($department->id);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->deleteJson('/api/departments/'.$department->id, [
            'target_department_id' => 99999,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('departments', ['id' => $department->id]);
    }

    public function test_delete_returns_available_departments_in_409_response(): void
    {
        $dept1 = Department::create(['name' => 'Source Dept', 'is_active' => true]);
        $dept2 = Department::create(['name' => 'Target A', 'is_active' => true]);
        $dept3 = Department::create(['name' => 'Target B', 'is_active' => true]);

        $this->createEmployeeWithDepartment($dept1->id);

        $this->actingAs($this->superadmin, 'web');

        $response = $this->deleteJson('/api/departments/'.$dept1->id);

        $response->assertStatus(409)
            ->assertJsonPath('data.assigned_employees_count', 1)
            ->assertJsonStructure(['data' => ['available_departments']]);

        $available = $response->json('data.available_departments');
        $this->assertGreaterThanOrEqual(2, count($available));
        $this->assertContains('Target A', array_column($available, 'name'));
        $this->assertContains('Target B', array_column($available, 'name'));
    }

    private function createUserWithRole(string $roleName): User
    {
        Tenant::findOrFail(1);

        $user = User::factory()->create(['tenant_id' => 1, 'status' => 'active']);
        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->sync([$role->id]);

        $managementDept = Department::firstOrCreate(
            ['name' => 'Management'],
            ['is_active' => true]
        );

        EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $managementDept->id,
            'position' => $roleName.' User',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => 40,
            'utilization_percent' => 60,
            'availability_status' => 'available',
        ]);

        return $user;
    }

    private function createEmployeeWithDepartment(int $departmentId): EmployeeProfile
    {
        $user = User::factory()->create([
            'tenant_id' => 1,
            'status' => 'active',
        ]);

        return EmployeeProfile::create([
            'tenant_id' => 1,
            'user_id' => $user->id,
            'department_id' => $departmentId,
            'position' => 'Technician',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 50,
            'availability_status' => 'available',
        ]);
    }
}
