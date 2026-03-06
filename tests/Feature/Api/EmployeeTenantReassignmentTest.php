<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class EmployeeTenantReassignmentTest extends TestCase
{
    protected Tenant $tenant1;

    protected Tenant $tenant2;

    protected User $admin;

    protected User $manager;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant1 = Tenant::findOrFail(1);
        $this->tenant2 = Tenant::findOrFail(999);

        $this->admin = $this->createUserWithRole('Admin', 'Management', $this->tenant1->id);
        $this->manager = $this->createUserWithRole('Manager', 'Operations Control', $this->tenant1->id);
        $this->superadmin = $this->createUserWithRole('Superadmin', 'Management', $this->tenant1->id);
    }

    public function test_admin_cannot_reassign_employee_with_tenant_id_payload(): void
    {
        $employee = $this->createEmployee(
            'admin-tenant-ignored@tests.local',
            'Operations Control',
            'Planner',
            $this->tenant1->id
        );

        $response = $this->actingAs($this->admin, 'web')
            ->putJson('/api/employees/'.$employee->id, [
                'tenant_id' => $this->tenant2->id,
                'position' => 'Admin Updated Planner',
            ]);

        $response->assertStatus(403);

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($this->tenant1->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Planner', $employee->position);
    }

    public function test_manager_cannot_reassign_employee_with_tenant_id_payload(): void
    {
        $employee = $this->createEmployee(
            'manager-tenant-ignored@tests.local',
            'Operations Control',
            'Coordinator',
            $this->tenant1->id
        );

        $response = $this->actingAs($this->manager, 'web')
            ->putJson('/api/employees/'.$employee->id, [
                'tenant_id' => $this->tenant2->id,
                'position' => 'Manager Updated Coordinator',
            ]);

        $response->assertStatus(403);

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($this->tenant1->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Coordinator', $employee->position);
    }

    public function test_superadmin_cannot_reassign_employee_to_archived_tenant(): void
    {
        $employee = $this->createEmployee(
            'superadmin-archived-target@tests.local',
            'Operations Control',
            'Planner',
            $this->tenant1->id
        );

        $this->tenant2->delete();

        $response = $this->actingAs($this->superadmin, 'web')
            ->putJson('/api/employees/'.$employee->id, [
                'tenant_id' => $this->tenant2->id,
                'position' => 'Should Not Move',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot update employees for archived tenant');

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($this->tenant1->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Planner', $employee->position);
    }

    public function test_superadmin_cannot_reassign_employee_to_invalid_tenant_id(): void
    {
        $employee = $this->createEmployee(
            'superadmin-invalid-target@tests.local',
            'Operations Control',
            'Planner',
            $this->tenant1->id
        );

        $response = $this->actingAs($this->superadmin, 'web')
            ->putJson('/api/employees/'.$employee->id, [
                'tenant_id' => 123456,
                'position' => 'Should Stay Put',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tenant_id']);

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($this->tenant1->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Planner', $employee->position);
    }

    public function test_reassignment_is_blocked_when_all_tenants_flag_is_used_for_write(): void
    {
        $employee = $this->createEmployee(
            'superadmin-all-tenants-write@tests.local',
            'Operations Control',
            'Planner',
            $this->tenant1->id
        );

        $response = $this->actingAs($this->superadmin, 'web')
            ->putJson('/api/employees/'.$employee->id.'?all_tenants=true', [
                'tenant_id' => $this->tenant2->id,
                'position' => 'Should Be Blocked',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($this->tenant1->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Planner', $employee->position);
    }

    private function createUserWithRole(string $roleName, string $department, int $tenantId): User
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'status' => 'active',
        ]);

        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->sync([$role->id]);

        EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId($tenantId, $department),
            'position' => $roleName.' Test User',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => 40,
            'utilization_percent' => 75,
            'availability_status' => 'available',
        ]);

        return $user;
    }

    private function createEmployee(string $email, string $department, string $position, int $tenantId): EmployeeProfile
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'email' => $email,
            'status' => 'active',
        ]);

        return EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId($tenantId, $department),
            'position' => $position,
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
