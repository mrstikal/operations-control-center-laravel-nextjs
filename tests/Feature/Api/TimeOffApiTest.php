<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TimeOffRequest;
use App\Models\User;
use Tests\TestCase;

class TimeOffApiTest extends TestCase
{
    protected Tenant $tenant;

    protected User $admin;

    protected User $manager;

    protected User $technician;

    protected User $superadmin;

    protected EmployeeProfile $managerProfile;

    protected EmployeeProfile $technicianProfile;

    protected EmployeeProfile $superadminProfile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::findOrFail(1);

        [$this->admin] = $this->createUserWithRole('Admin', 'Management');
        [$this->manager, $this->managerProfile] = $this->createUserWithRole('Manager', 'Operations Control');
        [$this->technician, $this->technicianProfile] = $this->createUserWithRole('Technician', 'Field Operations');
        [$this->superadmin, $this->superadminProfile] = $this->createUserWithRole('Superadmin', 'Management');
    }

    public function test_technician_can_create_request_for_self_only(): void
    {
        $ownResponse = $this->actingAs($this->technician, 'web')
            ->postJson('/api/time-off', [
                // employee_id omitted intentionally, API should default to current employee
                'start_date' => now()->addDays(2)->toDateString(),
                'end_date' => now()->addDays(4)->toDateString(),
                'type' => 'vacation',
                'reason' => 'Own leave',
            ]);

        $ownResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee_id', $this->technicianProfile->id);

        $otherEmployee = $this->createEmployee('other-tech@tests.local', 'Field Operations');

        $otherResponse = $this->actingAs($this->technician, 'web')
            ->postJson('/api/time-off', [
                'employee_id' => $otherEmployee->id,
                'start_date' => now()->addDays(5)->toDateString(),
                'end_date' => now()->addDays(6)->toDateString(),
                'type' => 'personal',
            ]);

        $otherResponse->assertStatus(403);
    }

    public function test_technician_cannot_create_request_with_all_tenants_flag(): void
    {
        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/time-off?all_tenants=true', [
                'start_date' => now()->addDays(3)->toDateString(),
                'end_date' => now()->addDays(4)->toDateString(),
                'type' => 'vacation',
                'reason' => 'Blocked write mode',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'all_tenants is read-only and cannot be used for write operations');
    }

    public function test_lower_than_manager_sees_only_own_requests(): void
    {
        $otherEmployee = $this->createEmployee('other-own-only@tests.local', 'Field Operations');

        TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        TimeOffRequest::create([
            'employee_id' => $otherEmployee->id,
            'start_date' => now()->addDays(4),
            'end_date' => now()->addDays(5),
            'type' => 'personal',
            'status' => 'pending',
            'requested_by' => $otherEmployee->user_id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->getJson('/api/time-off');

        $response->assertStatus(200);
        $employeeIds = collect($response->json('data'))->pluck('employee_id')->all();

        $this->assertContains($this->technicianProfile->id, $employeeIds);
        $this->assertNotContains($otherEmployee->id, $employeeIds);
    }

    public function test_manager_sees_only_own_department_requests(): void
    {
        $ownDeptEmployee = $this->createEmployee('ops-dept@tests.local', 'Operations Control');
        $otherDeptEmployee = $this->createEmployee('field-dept@tests.local', 'Field Operations');

        TimeOffRequest::create([
            'employee_id' => $ownDeptEmployee->id,
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(8),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $ownDeptEmployee->user_id,
            'requested_at' => now(),
        ]);

        TimeOffRequest::create([
            'employee_id' => $otherDeptEmployee->id,
            'start_date' => now()->addDays(9),
            'end_date' => now()->addDays(10),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $otherDeptEmployee->user_id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->getJson('/api/time-off');

        $response->assertStatus(200);
        $employeeIds = collect($response->json('data'))->pluck('employee_id')->all();

        $this->assertContains($ownDeptEmployee->id, $employeeIds);
        $this->assertNotContains($otherDeptEmployee->id, $employeeIds);
    }

    public function test_manager_can_approve_pending_request_and_employee_is_marked_on_leave(): void
    {
        $employee = $this->createEmployee('approve@tests.local', 'Operations Control');

        $request = TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->addDays(3),
            'end_date' => now()->addDays(5),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $employee->user_id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/time-off/'.$request->id.'/decide', [
                'status' => 'approved',
                'approval_note' => 'Approved for team planning.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('time_off_requests', [
            'id' => $request->id,
            'status' => 'approved',
            'approved_by' => $this->manager->id,
        ]);

        $this->assertDatabaseHas('employee_profiles', [
            'id' => $employee->id,
            'availability_status' => 'on_leave',
        ]);
    }

    public function test_owner_can_cancel_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(4),
            'end_date' => now()->addDays(6),
            'type' => 'personal',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/time-off/'.$request->id.'/cancel');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_technician_cannot_decide_requests(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->technician, 'web')
            ->postJson('/api/time-off/'.$request->id.'/decide', [
                'status' => 'approved',
            ]);

        $response->assertStatus(403);
    }

    public function test_manager_cannot_decide_own_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->managerProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->manager->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/time-off/'.$request->id.'/decide', [
                'status' => 'approved',
            ]);

        $response->assertStatus(403);
    }

    public function test_superadmin_can_decide_own_request_exception(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->superadminProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->superadmin->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->superadmin, 'web')
            ->postJson('/api/time-off/'.$request->id.'/decide', [
                'status' => 'approved',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_admin_can_archive_time_off_request(): void
    {
        $employee = $this->createEmployee('archive-admin@tests.local', 'Operations Control');

        $request = TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $employee->user_id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'web')
            ->postJson('/api/time-off/'.$request->id.'/archive');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('time_off_requests', [
            'id' => $request->id,
        ]);
        $this->assertNotNull(TimeOffRequest::find($request->id)?->archived_at);
    }

    public function test_superadmin_can_archive_time_off_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->superadminProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->superadmin->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->superadmin, 'web')
            ->postJson('/api/time-off/'.$request->id.'/archive');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertNotNull(TimeOffRequest::find($request->id)?->archived_at);
    }

    public function test_manager_cannot_archive_time_off_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->managerProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->manager->id,
            'requested_at' => now(),
        ]);

        $response = $this->actingAs($this->manager, 'web')
            ->postJson('/api/time-off/'.$request->id.'/archive');

        $response->assertStatus(403);
    }

    public function test_archived_requests_are_hidden_by_default_and_visible_with_status_filter(): void
    {
        $activeEmployee = $this->createEmployee('active-archive@tests.local', 'Operations Control');
        $archivedEmployee = $this->createEmployee('archived-archive@tests.local', 'Operations Control');

        $activeRequest = TimeOffRequest::create([
            'employee_id' => $activeEmployee->id,
            'start_date' => now()->addDays(4),
            'end_date' => now()->addDays(5),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $activeEmployee->user_id,
            'requested_at' => now(),
            'archived_at' => null,
        ]);

        $archivedRequest = TimeOffRequest::create([
            'employee_id' => $archivedEmployee->id,
            'start_date' => now()->addDays(6),
            'end_date' => now()->addDays(7),
            'type' => 'personal',
            'status' => 'approved',
            'requested_by' => $archivedEmployee->user_id,
            'requested_at' => now(),
            'archived_at' => now(),
        ]);

        $defaultList = $this->actingAs($this->admin, 'web')
            ->getJson('/api/time-off');

        $defaultIds = collect($defaultList->json('data'))->pluck('id')->all();
        $this->assertContains($activeRequest->id, $defaultIds);
        $this->assertNotContains($archivedRequest->id, $defaultIds);

        $archivedList = $this->actingAs($this->admin, 'web')
            ->getJson('/api/time-off?status=archived');

        $archivedIds = collect($archivedList->json('data'))->pluck('id')->all();
        $this->assertContains($archivedRequest->id, $archivedIds);
        $this->assertNotContains($activeRequest->id, $archivedIds);
    }

    public function test_can_show_own_request_detail(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        $this->actingAs($this->technician, 'web')
            ->getJson('/api/time-off/'.$request->id)
            ->assertStatus(200)
            ->assertJsonPath('data.id', $request->id);
    }

    public function test_owner_can_update_pending_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(5),
            'end_date' => now()->addDays(6),
            'type' => 'personal',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        $this->actingAs($this->technician, 'web')
            ->putJson('/api/time-off/'.$request->id, [
                'reason' => 'Updated due to project schedule',
                'type' => 'vacation',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.reason', 'Updated due to project schedule')
            ->assertJsonPath('data.type', 'vacation');
    }

    public function test_statistics_are_role_scoped(): void
    {
        $baseDate = now()->startOfYear()->addDays(30);

        TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => $baseDate->copy(),
            'end_date' => $baseDate->copy()->addDay(),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
        ]);

        TimeOffRequest::create([
            'employee_id' => $this->managerProfile->id,
            'start_date' => $baseDate->copy()->addDays(3),
            'end_date' => $baseDate->copy()->addDays(4),
            'type' => 'sick_leave',
            'status' => 'approved',
            'requested_by' => $this->manager->id,
            'requested_at' => now(),
        ]);

        $technicianResponse = $this->actingAs($this->technician, 'web')
            ->getJson('/api/time-off/statistics')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1);

        $adminResponse = $this->actingAs($this->admin, 'web')
            ->getJson('/api/time-off/statistics')
            ->assertStatus(200);

        $this->assertGreaterThanOrEqual(
            (int) $technicianResponse->json('data.total'),
            (int) $adminResponse->json('data.total')
        );
    }

    public function test_admin_can_restore_archived_request(): void
    {
        $request = TimeOffRequest::create([
            'employee_id' => $this->technicianProfile->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $this->technician->id,
            'requested_at' => now(),
            'archived_at' => now(),
        ]);

        $this->actingAs($this->admin, 'web')
            ->postJson('/api/time-off/'.$request->id.'/restore')
            ->assertStatus(200)
            ->assertJsonPath('data.id', $request->id);

        $this->assertDatabaseHas('time_off_requests', [
            'id' => $request->id,
            'archived_at' => null,
        ]);
    }

    private function createUserWithRole(string $roleName, string $department): array
    {
        $user = User::factory()->create(['tenant_id' => 1, 'status' => 'active']);
        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->sync([$role->id]);

        $profile = EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId(1, $department),
            'position' => $roleName.' User',
            'hire_date' => now()->subYears(2),
            'available_hours_per_week' => 40,
            'utilization_percent' => 60,
            'availability_status' => 'available',
        ]);

        return [$user, $profile];
    }

    private function createEmployee(string $email, string $department): EmployeeProfile
    {
        $user = User::factory()->create([
            'tenant_id' => 1,
            'email' => $email,
            'status' => 'active',
        ]);

        return EmployeeProfile::create([
            'user_id' => $user->id,
            'department_id' => $this->resolveDepartmentId(1, $department),
            'position' => 'Test Employee',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 55,
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
