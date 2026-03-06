<?php

namespace Tests\Unit\Models;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\TimeOffRequest;
use App\Models\User;
use Tests\TestCase;

class TimeOffRequestTest extends TestCase
{
    public function test_scopes_pending_and_approved_filter_correctly(): void
    {
        $employee = $this->createEmployee();

        TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(3),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $employee->user_id,
            'requested_at' => now(),
        ]);

        TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->addDays(4),
            'end_date' => now()->addDays(5),
            'type' => 'personal',
            'status' => 'approved',
            'requested_by' => $employee->user_id,
            'requested_at' => now(),
            'decided_at' => now(),
        ]);

        $this->assertCount(1, TimeOffRequest::pending()->get());
        $this->assertCount(1, TimeOffRequest::approved()->get());
    }

    public function test_approve_and_reject_methods_update_state(): void
    {
        $employee = $this->createEmployee();
        $approver = User::factory()->create(['tenant_id' => 1]);

        $request = TimeOffRequest::create([
            'employee_id' => $employee->id,
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(8),
            'type' => 'vacation',
            'status' => 'pending',
            'requested_by' => $employee->user_id,
            'requested_at' => now(),
        ]);

        $this->assertTrue($request->isPending());

        $request->approve($approver, 'Approved note');
        $request->refresh();
        $this->assertEquals('approved', $request->status);
        $this->assertEquals($approver->id, $request->approved_by);

        $request->reject($approver, 'Rejected note');
        $request->refresh();
        $this->assertEquals('rejected', $request->status);
        $this->assertEquals('Rejected note', $request->approval_note);
    }

    private function createEmployee(): EmployeeProfile
    {
        $user = User::factory()->create(['tenant_id' => 1]);

        $department = Department::firstOrCreate(
            ['tenant_id' => 1, 'name' => 'Operations Control'],
            ['is_active' => true]
        );

        return EmployeeProfile::create([
            'tenant_id' => 1,
            'user_id' => $user->id,
            'department_id' => $department->id,
            'position' => 'Analyst',
            'hire_date' => now()->subYear(),
            'available_hours_per_week' => 40,
            'utilization_percent' => 50,
            'availability_status' => 'available',
        ]);
    }
}
