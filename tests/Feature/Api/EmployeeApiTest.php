<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\TimeOffRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeApiTest extends TestCase
{
    protected Tenant $tenant;

    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::findOrFail(1);

        $this->admin = $this->createUserWithRole('Admin', 'Management');
        $this->manager = $this->createUserWithRole('Manager', 'Operations Control');
        $this->technician = $this->createUserWithRole('Technician', 'Field Operations');
    }

    public function test_admin_can_list_employees_in_own_tenant_only(): void
    {
        $tenant1Employee = $this->createEmployee('tenant1-a@tests.local', 'Operations Control', 'Coordinator', 1);
        $this->createEmployee('tenant1-b@tests.local', 'Field Operations', 'Technician', 1);

        $otherTenant = Tenant::findOrFail(999);
        $otherUser = User::factory()->create(['tenant_id' => $otherTenant->id]);
        $otherDeptId = $this->resolveDepartmentId($otherTenant->id, 'Operations Control');
        EmployeeProfile::create([
            'user_id' => $otherUser->id,
            'department_id' => $otherDeptId,
            'position' => 'Other Tenant Employee',
            'hire_date' => now()->subYears(1),
            'available_hours_per_week' => 40,
            'utilization_percent' => 60,
            'availability_status' => 'available',
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'pagination']);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($tenant1Employee->id, $ids);
        $this->assertCount(5, $ids); // admin + manager + tech + 2 created in tenant 1
    }

    public function test_manager_sees_only_own_department(): void
    {
        $opsEmployee = $this->createEmployee('ops@tests.local', 'Operations Control', 'Analyst', 1);
        $fieldEmployee = $this->createEmployee('field@tests.local', 'Field Operations', 'Technician', 1);

        $response = $this->actingAs($this->manager, 'web')
            ->getJson('/api/employees');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($opsEmployee->id, $ids);
        $this->assertNotContains($fieldEmployee->id, $ids);
    }

    public function test_technician_sees_only_available_employees(): void
    {
        $available = $this->createEmployee('available@tests.local', 'Field Operations', 'Tech A', 1, 'available');
        $onLeave = $this->createEmployee('leave@tests.local', 'Field Operations', 'Tech B', 1, 'on_leave');

        $response = $this->actingAs($this->technician, 'web')
            ->getJson('/api/employees');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($available->id, $ids);
        $this->assertNotContains($onLeave->id, $ids);
    }

    public function test_employee_list_includes_tenant_payload(): void
    {
        $employee = $this->createEmployee('tenant-payload-list@tests.local', 'Operations Control', 'Planner', 1);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $row = collect($response->json('data'))->firstWhere('id', $employee->id);

        $this->assertNotNull($row);
        $this->assertSame(1, $row['tenant_id']);
        $this->assertSame(1, data_get($row, 'tenant.id'));
        $this->assertSame($this->tenant->name, data_get($row, 'tenant.name'));
    }

    public function test_employee_detail_contains_shift_timeoff_and_workload_sections(): void
    {
        $employee = $this->createEmployee('detail@tests.local', 'Operations Control', 'Planner', 1);

        $shift = Shift::create([
            'name' => 'Detail Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Test shift',
            'is_active' => true,
        ]);

        DB::table('employee_shifts')->insert([
            'employee_id' => $employee->id,
            'shift_id' => $shift->id,
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->subDays(20),
            'end_date' => now()->subDays(18),
            'type' => 'vacation',
            'status' => 'approved',
            'requested_by' => $employee->user_id,
            'approved_by' => $this->manager->id,
            'reason' => 'Past vacation',
            'requested_at' => now()->subDays(30),
            'decided_at' => now()->subDays(25),
        ]);

        DB::table('workloads')->insert([
            'employee_id' => $employee->id,
            'work_date' => now()->subDay()->toDateString(),
            'hours_allocated' => 7.5,
            'hours_actual' => 8.0,
            'capacity_utilization' => 93.75,
            'tasks' => json_encode(['focus' => 'Daily operations']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees/'.$employee->id);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => ['id', 'shifts', 'time_off_requests', 'workload', 'this_week_hours', 'pending_timeoff'],
            ]);
    }

    public function test_employee_detail_includes_tenant_payload(): void
    {
        $employee = $this->createEmployee('tenant-payload-detail@tests.local', 'Operations Control', 'Planner', 1);

        $response = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees/'.$employee->id);

        $response->assertStatus(200)
            ->assertJsonPath('data.tenant_id', 1)
            ->assertJsonPath('data.tenant.id', 1)
            ->assertJsonPath('data.tenant.name', $this->tenant->name);
    }

    public function test_superadmin_can_filter_employees_by_tenant_id(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin', 'Management');

        $tenantOneEmployee = $this->createEmployee('superadmin-filter-1@tests.local', 'Operations Control', 'Planner', 1);
        $otherTenant = Tenant::findOrFail(999);
        $otherTenantEmployee = $this->createEmployee(
            'superadmin-filter-999@tests.local',
            'Operations Control',
            'Planner',
            $otherTenant->id
        );

        $response = $this->actingAs($superadmin, 'web')
            ->getJson('/api/employees?tenant_id='.$otherTenant->id);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($otherTenantEmployee->id, $ids);
        $this->assertNotContains($tenantOneEmployee->id, $ids);

        $row = collect($response->json('data'))->firstWhere('id', $otherTenantEmployee->id);
        $this->assertSame($otherTenant->id, data_get($row, 'tenant.id'));
        $this->assertSame($otherTenant->name, data_get($row, 'tenant.name'));
    }

    public function test_manager_cannot_update_employee_from_other_department(): void
    {
        $target = $this->createEmployee('other-dept@tests.local', 'Field Operations', 'Technician', 1);

        $response = $this->actingAs($this->manager, 'web')
            ->putJson('/api/employees/'.$target->id, [
                'position' => 'Updated Position',
            ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_edit_employee(): void
    {
        $target = $this->createEmployee('tech-edit-target@tests.local', 'Field Operations', 'Technician', 1);

        $response = $this->actingAs($this->technician, 'web')
            ->putJson('/api/employees/'.$target->id, [
                'position' => 'Should Not Update',
            ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_create_employee(): void
    {
        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/employees', [
                'name' => 'Should Not Create',
                'email' => 'nocreate@tests.local',
                'department_id' => $this->resolveDepartmentId(1, 'Field Operations'),
                'position' => 'Technician',
            ]);

        $response->assertStatus(403);
    }

    public function test_manager_can_create_employee_in_own_department(): void
    {
        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/employees', [
                'name' => 'New Employee',
                'email' => 'newemployee@tests.local',
                'department_id' => $this->resolveDepartmentId(1, 'Operations Control'),
                'position' => 'New Position',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', ['email' => 'newemployee@tests.local']);
    }

    public function test_superadmin_can_create_employee_for_explicit_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin', 'Management');
        $otherTenant = Tenant::findOrFail(999);

        $response = $this->actingAs($superadmin, 'web')
            ->postJson('/api/employees', [
                'tenant_id' => $otherTenant->id,
                'name' => 'Cross Tenant Employee',
                'email' => 'cross-tenant-employee@tests.local',
                'department_id' => $this->resolveDepartmentId($otherTenant->id, 'Operations Control'),
                'position' => 'Cross Tenant Planner',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $user = User::where('email', 'cross-tenant-employee@tests.local')->first();

        $this->assertNotNull($user);
        $this->assertSame($otherTenant->id, (int) $user->tenant_id);
        $this->assertDatabaseHas('employee_profiles', ['user_id' => $user->id]);
    }

    public function test_manager_cannot_create_employee_with_all_tenants_flag(): void
    {
        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/employees?all_tenants=true', [
                'name' => 'Blocked Employee',
                'email' => 'blocked-employee@tests.local',
                'department_id' => $this->resolveDepartmentId(1, 'Operations Control'),
                'position' => 'Planner',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');

        $this->assertDatabaseMissing('users', ['email' => 'blocked-employee@tests.local']);
    }

    public function test_technician_cannot_delete_employee(): void
    {
        $target = $this->createEmployee('tech-delete-target@tests.local', 'Field Operations', 'Technician', 1);

        $response = $this->actingAs($this->technician, 'web')
            ->deleteJson('/api/employees/'.$target->id);

        $response->assertStatus(403);
    }

    public function test_manager_can_delete_employee_in_own_department(): void
    {
        $target = $this->createEmployee('manager-delete-own@tests.local', 'Operations Control', 'Planner', 1);

        $this->actingAs($this->manager, 'web')
            ->deleteJson('/api/employees/'.$target->id)
            ->assertStatus(200);

        $this->assertSoftDeleted('employee_profiles', ['id' => $target->id]);
    }

    public function test_manager_cannot_delete_employee_from_other_department(): void
    {
        $target = $this->createEmployee('manager-delete-other@tests.local', 'Field Operations', 'Technician', 1);

        $this->actingAs($this->manager, 'web')
            ->deleteJson('/api/employees/'.$target->id)
            ->assertStatus(403);
    }

    public function test_superadmin_can_reassign_employee_to_another_tenant(): void
    {
        $superadmin = $this->createUserWithRole('Superadmin', 'Management');
        $employee = $this->createEmployee('reassign-tenant@tests.local', 'Operations Control', 'Planner', 1);
        $otherTenant = Tenant::findOrFail(999);

        $response = $this->actingAs($superadmin, 'web')
            ->putJson('/api/employees/'.$employee->id, [
                'tenant_id' => $otherTenant->id,
                'position' => 'Reassigned Planner',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $employee->refresh();
        $employee->user->refresh();

        $this->assertSame($otherTenant->id, (int) data_get($employee, 'user.tenant_id'));
        $this->assertSame('Reassigned Planner', $employee->position);
    }

    public function test_employee_soft_delete_restore_and_hard_delete_cycle(): void
    {
        $employee = $this->createEmployee('delete-cycle@tests.local', 'Operations Control', 'Planner', 1);

        $this->actingAs($this->admin, 'web')
            ->deleteJson('/api/employees/'.$employee->id)
            ->assertStatus(200);

        $this->assertSoftDeleted('employee_profiles', ['id' => $employee->id]);

        $defaultList = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees');
        $defaultIds = collect($defaultList->json('data'))->pluck('id')->all();
        $this->assertNotContains($employee->id, $defaultIds);

        $deletedList = $this->actingAs($this->admin, 'web')
            ->getJson('/api/employees?status=deleted');
        $deletedIds = collect($deletedList->json('data'))->pluck('id')->all();
        $this->assertContains($employee->id, $deletedIds);

        $this->actingAs($this->admin, 'web')
            ->postJson('/api/employees/'.$employee->id.'/restore')
            ->assertStatus(200);

        $this->assertDatabaseHas('employee_profiles', [
            'id' => $employee->id,
            'deleted_at' => null,
        ]);

        $this->actingAs($this->admin, 'web')
            ->deleteJson('/api/employees/'.$employee->id)
            ->assertStatus(200);

        $this->actingAs($this->admin, 'web')
            ->deleteJson('/api/employees/'.$employee->id.'/hard-delete')
            ->assertStatus(200);

        $this->assertDatabaseMissing('employee_profiles', ['id' => $employee->id]);
    }

    public function test_hard_delete_requires_soft_delete_first(): void
    {
        $employee = $this->createEmployee('hard-delete-check@tests.local', 'Operations Control', 'Planner', 1);

        $this->actingAs($this->admin, 'web')
            ->deleteJson('/api/employees/'.$employee->id.'/hard-delete')
            ->assertStatus(422);
    }

    private function createUserWithRole(string $roleName, string $department): User
    {
        $user = User::factory()->create(['tenant_id' => 1, 'status' => 'active']);
        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->sync([$role->id]);

        EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId(1, $department),
            'position' => $roleName.' Test User',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => 40,
            'utilization_percent' => 75,
            'availability_status' => 'available',
        ]);

        return $user;
    }

    private function createEmployee(
        string $email,
        string $department,
        string $position,
        int $tenantId,
        string $availabilityStatus = 'available'
    ): EmployeeProfile {
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
            'availability_status' => $availabilityStatus,
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
