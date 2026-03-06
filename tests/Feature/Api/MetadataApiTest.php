<?php

namespace Tests\Feature\Api;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use Tests\TestCase;

class MetadataApiTest extends TestCase
{
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'tenant_id' => 1,
            'status' => 'active',
        ]);
    }

    public function test_metadata_endpoints_require_authentication(): void
    {
        $this->getJson('/api/metadata/hr')->assertStatus(401);
        $this->getJson('/api/metadata/departments')->assertStatus(401);
        $this->getJson('/api/metadata/positions')->assertStatus(401);
    }

    public function test_hr_metadata_returns_expected_shape(): void
    {
        $this->createProfile(1, 'Operations Control', 'Dispatcher');

        $response = $this->actingAs($this->user, 'web')
            ->getJson('/api/metadata/hr');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'HR metadata retrieved successfully')
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'departments',
                    'availability_statuses',
                    'time_off_types',
                    'time_off_statuses',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.availability_statuses'));
        $this->assertNotEmpty($response->json('data.time_off_types'));
        $this->assertNotEmpty($response->json('data.time_off_statuses'));
    }

    public function test_departments_endpoint_returns_distinct_and_sorted_values(): void
    {
        $this->createProfile(1, 'Technical Services', 'Tech');
        $this->createProfile(1, 'Asset Management', 'Asset Lead');
        $this->createProfile(1, 'Technical Services', 'Tech 2');
        $this->createProfile(1, null, 'No Department');

        $response = $this->actingAs($this->user, 'web')
            ->getJson('/api/metadata/departments');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Departments retrieved successfully');

        $departments = $response->json('data');

        $this->assertContains('Asset Management', $departments);
        $this->assertContains('Technical Services', $departments);
        $this->assertNotContains(null, $departments);
        $this->assertSame(array_values(array_unique($departments)), $departments);

        $sorted = $departments;
        sort($sorted);
        $this->assertSame($sorted, $departments);
    }

    public function test_positions_endpoint_returns_distinct_and_sorted_values(): void
    {
        $this->createProfile(1, 'Operations Control', 'Coordinator');
        $this->createProfile(1, 'Operations Control', 'Analyst');
        $this->createProfile(1, 'Operations Control', 'Coordinator');
        $this->createProfile(1, 'Operations Control', null);

        $response = $this->actingAs($this->user, 'web')
            ->getJson('/api/metadata/positions');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Positions retrieved successfully');

        $positions = $response->json('data');

        $this->assertContains('Analyst', $positions);
        $this->assertContains('Coordinator', $positions);
        $this->assertNotContains(null, $positions);
        $this->assertSame(array_values(array_unique($positions)), $positions);

        $sorted = $positions;
        sort($sorted);
        $this->assertSame($sorted, $positions);
    }

    public function test_hr_metadata_departments_match_departments_endpoint(): void
    {
        $this->createProfile(1, 'Emergency Services', 'Responder');
        $this->createProfile(1, 'Field Operations', 'Technician');

        $hr = $this->actingAs($this->user, 'web')
            ->getJson('/api/metadata/hr')
            ->assertStatus(200)
            ->json('data.departments');

        $departments = $this->actingAs($this->user, 'web')
            ->getJson('/api/metadata/departments')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame($departments, $hr);
    }

    private function createProfile(int $tenantId, ?string $department, ?string $position): EmployeeProfile
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'status' => 'active',
        ]);

        $departmentId = $department ? $this->resolveDepartmentId($tenantId, $department) : null;

        return EmployeeProfile::create([
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'department_id' => $departmentId,
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
