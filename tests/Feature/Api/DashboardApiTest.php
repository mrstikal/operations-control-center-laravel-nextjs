<?php

namespace Tests\Feature\Api;

use App\Models\Contract;
use App\Models\Incident;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_requires_authentication(): void
    {
        $this->getJson('/api/dashboard/summary')->assertStatus(401);
    }

    public function test_summary_returns_expected_kpis_for_current_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $user = $this->createUserWithDashboardPermissions($tenant->id);

        Contract::create([
            'tenant_id' => $tenant->id,
            'contract_number' => 'CNT-A-001',
            'title' => 'HVAC Retrofit - Building A',
            'status' => 'done',
            'priority' => 'high',
            'sla_status' => 'on_track',
        ]);
        Contract::create([
            'tenant_id' => $tenant->id,
            'contract_number' => 'CNT-A-002',
            'title' => 'UPS Battery Replacement',
            'status' => 'blocked',
            'priority' => 'critical',
            'sla_status' => 'breached',
        ]);
        Contract::create([
            'tenant_id' => $tenant->id,
            'contract_number' => 'CNT-A-003',
            'title' => 'Network Core Upgrade',
            'status' => 'in_progress',
            'priority' => 'medium',
            'sla_status' => 'at_risk',
        ]);

        Incident::create([
            'tenant_id' => $tenant->id,
            'incident_number' => 'INC-A-001',
            'title' => 'Server Room Temperature Spike',
            'description' => 'Cooling unit reached warning threshold in zone 2.',
            'category' => 'hvac',
            'severity' => 'high',
            'priority' => 'high',
            'status' => 'open',
            'reported_by' => $user->id,
            'reported_at' => now(),
            'sla_breached' => false,
        ]);
        Incident::create([
            'tenant_id' => $tenant->id,
            'incident_number' => 'INC-A-002',
            'title' => 'Fiber Link Intermittent Packet Loss',
            'description' => 'Backbone uplink reports packet loss every 5 minutes.',
            'category' => 'network',
            'severity' => 'critical',
            'priority' => 'critical',
            'status' => 'escalated',
            'reported_by' => $user->id,
            'reported_at' => now(),
            'sla_breached' => false,
        ]);
        Incident::create([
            'tenant_id' => $tenant->id,
            'incident_number' => 'INC-A-003',
            'title' => 'Badge Reader Offline',
            'description' => 'Main lobby badge reader became unresponsive.',
            'category' => 'security',
            'severity' => 'medium',
            'priority' => 'medium',
            'status' => 'closed',
            'reported_by' => $user->id,
            'reported_at' => now(),
            'closed_at' => now(),
            'sla_breached' => true,
        ]);

        $token = $user->createToken('dashboard-test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.contracts_total', 3)
            ->assertJsonPath('data.kpis.contracts_done', 1)
            ->assertJsonPath('data.kpis.contracts_blocked', 1)
            ->assertJsonPath('data.kpis.contracts_sla_breached', 1)
            ->assertJsonPath('data.kpis.incidents_total', 3)
            ->assertJsonPath('data.kpis.incidents_open', 2)
            ->assertJsonPath('data.kpis.incidents_escalated', 1)
            ->assertJsonPath('data.kpis.incidents_sla_breached', 1);
    }

    public function test_summary_is_tenant_isolated(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $userA = $this->createUserWithDashboardPermissions($tenantA->id);

        Contract::create([
            'tenant_id' => $tenantA->id,
            'contract_number' => 'CNT-TA-001',
            'title' => 'Tenant A Contract',
            'status' => 'done',
            'priority' => 'medium',
        ]);
        Contract::create([
            'tenant_id' => $tenantB->id,
            'contract_number' => 'CNT-TB-001',
            'title' => 'Tenant B Contract',
            'status' => 'done',
            'priority' => 'medium',
        ]);

        Incident::create([
            'tenant_id' => $tenantA->id,
            'incident_number' => 'INC-TA-001',
            'title' => 'Tenant A Incident',
            'description' => 'Tenant A incident detail.',
            'category' => 'operations',
            'severity' => 'high',
            'priority' => 'high',
            'status' => 'open',
            'reported_by' => $userA->id,
            'reported_at' => now(),
        ]);

        $userB = User::factory()->create(['tenant_id' => $tenantB->id]);
        Incident::create([
            'tenant_id' => $tenantB->id,
            'incident_number' => 'INC-TB-001',
            'title' => 'Tenant B Incident',
            'description' => 'Tenant B incident detail.',
            'category' => 'operations',
            'severity' => 'high',
            'priority' => 'high',
            'status' => 'open',
            'reported_by' => $userB->id,
            'reported_at' => now(),
        ]);

        $token = $userA->createToken('dashboard-test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 1)
            ->assertJsonPath('data.kpis.incidents_total', 1);
    }

    private function createUserWithDashboardPermissions(int $tenantId): User
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'role' => 'viewer',
        ]);

        $role = Role::create([
            'tenant_id' => $tenantId,
            'name' => 'Dashboard Viewer',
            'description' => 'Can view dashboard metrics',
            'level' => 'viewer',
            'is_system' => false,
        ]);

        $contractsView = Permission::create([
            'tenant_id' => $tenantId,
            'name' => 'contracts.view',
            'resource' => 'contracts',
            'action' => 'view',
            'description' => 'View contracts',
        ]);

        $incidentsView = Permission::create([
            'tenant_id' => $tenantId,
            'name' => 'incidents.view',
            'resource' => 'incidents',
            'action' => 'view',
            'description' => 'View incidents',
        ]);

        $role->permissions()->attach([$contractsView->id, $incidentsView->id]);
        $user->roles()->attach($role->id);

        return $user;
    }
}
