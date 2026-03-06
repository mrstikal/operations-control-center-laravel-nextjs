<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Contract;
use App\Models\Event;
use App\Models\EventProjection;
use App\Models\Incident;
use App\Models\MaintenanceSchedule;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

        $this->actingAs($user, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Dashboard summary retrieved successfully')
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

        $this->actingAs($userA, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 1)
            ->assertJsonPath('data.kpis.incidents_total', 1);
    }

    public function test_summary_includes_monitoring_metrics_and_alerts(): void
    {
        Cache::flush();

        $tenant = Tenant::factory()->create();
        $user = $this->createUserWithDashboardPermissions($tenant->id);

        $category = AssetCategory::factory()->create(['tenant_id' => $tenant->id]);
        $asset = Asset::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
        ]);

        MaintenanceSchedule::create([
            'asset_id' => $asset->id,
            'frequency' => 'monthly',
            'description' => 'Overdue schedule',
            'next_due_date' => now()->subDay(),
            'is_active' => true,
            'due_state' => MaintenanceSchedule::DUE_STATE_OVERDUE,
        ]);

        Cache::put('monitoring:api_status:4xx:'.now()->format('YmdH'), 3, now()->addHours(2));
        Cache::put('monitoring:api_status:5xx:'.now()->format('YmdH'), 2, now()->addHours(2));

        DB::table('failed_jobs')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\EvaluateMaintenanceSchedulesJob']),
            'exception' => 'Test exception',
            'failed_at' => now(),
        ]);

        $this->actingAs($user, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.monitoring.overdue_maintenance', 1)
            ->assertJsonPath('data.monitoring.api_errors_last_24h.4xx', 3)
            ->assertJsonPath('data.monitoring.api_errors_last_24h.5xx', 2)
            ->assertJsonPath('data.monitoring.job_failures_last_24h.total', 1)
            ->assertJsonCount(3, 'data.monitoring.alerts');
    }

    public function test_summary_uses_projection_for_tenant_wide_dashboard_roles(): void
    {
        $tenant = Tenant::factory()->create();
        $user = $this->createUserWithDashboardPermissions($tenant->id);

        [$incidentEvent, $contractEvent] = Event::withoutEvents(function () use ($tenant, $user): array {
            $incidentEvent = Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => 5001,
                'user_id' => $user->id,
                'payload' => ['attributes' => ['status' => 'open']],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now()->subMinute(),
            ]);

            $contractEvent = Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 7001,
                'user_id' => $user->id,
                'payload' => ['attributes' => ['status' => 'in_progress']],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);

            return [$incidentEvent, $contractEvent];
        });

        EventProjection::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'projection_name' => 'incidents_summary',
            ],
            [
                'source_event_type' => 'IncidentCreated',
                'last_processed_event_id' => $incidentEvent->id,
                'last_processed_version' => 1,
                'projection_state' => [
                    'dashboard_kpi' => [
                        'incidents_total' => 12,
                        'incidents_open' => 3,
                        'incidents_in_progress' => 4,
                        'incidents_escalated' => 2,
                        'incidents_resolved_today' => 1,
                        'sla_breached' => 2,
                    ],
                ],
                'is_active' => true,
            ]
        );

        EventProjection::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'projection_name' => 'contracts_summary',
            ],
            [
                'source_event_type' => 'ContractCreated',
                'last_processed_event_id' => $contractEvent->id,
                'last_processed_version' => 1,
                'projection_state' => [
                    'dashboard_kpi' => [
                        'contracts_total' => 9,
                        'contracts_active' => 5,
                        'contracts_pending' => 1,
                        'contracts_done' => 2,
                        'contracts_blocked' => 1,
                        'contracts_sla_breached' => 2,
                        'contracts_expiring_30_days' => 3,
                        'contracts_overdue' => 1,
                        'total_budget' => 10000,
                        'total_spent' => 2500,
                    ],
                ],
                'is_active' => true,
            ]
        );

        $this->actingAs($user, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.incidents_total', 12)
            ->assertJsonPath('data.kpis.incidents_open', 9)
            ->assertJsonPath('data.kpis.contracts_total', 9)
            ->assertJsonPath('data.kpis.contracts_done', 2)
            ->assertJsonPath('data.kpis.contracts_blocked', 1)
            ->assertJsonPath('data.kpis.contracts_sla_breached', 2);
    }

    public function test_summary_falls_back_to_database_when_projection_is_stale(): void
    {
        $tenant = Tenant::factory()->create();
        $user = $this->createUserWithDashboardPermissions($tenant->id);

        Contract::create([
            'tenant_id' => $tenant->id,
            'contract_number' => 'CNT-FB-001',
            'title' => 'Fallback contract',
            'status' => 'done',
            'priority' => 'high',
            'sla_status' => 'breached',
        ]);

        Incident::create([
            'tenant_id' => $tenant->id,
            'incident_number' => 'INC-FB-001',
            'title' => 'Fallback incident',
            'description' => 'Uses SQL fallback when projection stale.',
            'category' => 'operations',
            'severity' => 'high',
            'priority' => 'high',
            'status' => 'open',
            'reported_by' => $user->id,
            'reported_at' => now(),
            'sla_breached' => true,
        ]);

        [$newestIncidentEvent, $newestContractEvent] = Event::withoutEvents(function () use ($tenant, $user): array {
            $newestIncidentEvent = Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'IncidentCreated',
                'aggregate_type' => 'Incident',
                'aggregate_id' => 9101,
                'user_id' => $user->id,
                'payload' => ['attributes' => ['status' => 'open']],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);

            $newestContractEvent = Event::create([
                'tenant_id' => $tenant->id,
                'event_type' => 'ContractCreated',
                'aggregate_type' => 'Contract',
                'aggregate_id' => 9201,
                'user_id' => $user->id,
                'payload' => ['attributes' => ['status' => 'done']],
                'metadata' => ['source' => 'test'],
                'version' => 1,
                'occurred_at' => now(),
            ]);

            return [$newestIncidentEvent, $newestContractEvent];
        });

        EventProjection::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'projection_name' => 'incidents_summary',
            ],
            [
                'source_event_type' => 'IncidentCreated',
                'last_processed_event_id' => $newestIncidentEvent->id - 1,
                'last_processed_version' => 1,
                'projection_state' => [
                    'dashboard_kpi' => [
                        'incidents_total' => 99,
                        'incidents_open' => 99,
                        'incidents_in_progress' => 0,
                        'incidents_escalated' => 0,
                        'incidents_resolved_today' => 0,
                        'sla_breached' => 0,
                    ],
                ],
                'is_active' => true,
            ]
        );

        EventProjection::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'projection_name' => 'contracts_summary',
            ],
            [
                'source_event_type' => 'ContractCreated',
                'last_processed_event_id' => $newestContractEvent->id - 1,
                'last_processed_version' => 1,
                'projection_state' => [
                    'dashboard_kpi' => [
                        'contracts_total' => 99,
                        'contracts_active' => 0,
                        'contracts_pending' => 0,
                        'contracts_done' => 0,
                        'contracts_blocked' => 0,
                        'contracts_sla_breached' => 0,
                        'contracts_expiring_30_days' => 0,
                        'contracts_overdue' => 0,
                        'total_budget' => 0,
                        'total_spent' => 0,
                    ],
                ],
                'is_active' => true,
            ]
        );

        $this->actingAs($user, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 1)
            ->assertJsonPath('data.kpis.contracts_done', 1)
            ->assertJsonPath('data.kpis.contracts_sla_breached', 1)
            ->assertJsonPath('data.kpis.incidents_total', 1)
            ->assertJsonPath('data.kpis.incidents_open', 1)
            ->assertJsonPath('data.kpis.incidents_sla_breached', 1);
    }

    public function test_read_models_requires_authentication(): void
    {
        $this->getJson('/api/dashboard/read-models')->assertStatus(401);
    }

    public function test_feed_requires_authentication(): void
    {
        $this->getJson('/api/dashboard/feed')->assertStatus(401);
    }

    public function test_feed_is_tenant_scoped(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $superadmin = $this->createSuperadminWithDashboardPermissions($tenantA->id);

        Event::create([
            'tenant_id' => $tenantA->id,
            'event_type' => 'IncidentCreated',
            'aggregate_type' => 'Incident',
            'aggregate_id' => 3001,
            'user_id' => $superadmin->id,
            'payload' => ['incident_number' => 'INC-TA-3001', 'attributes' => ['status' => 'open']],
            'metadata' => ['scope' => 'tenant-a'],
            'version' => 1,
            'occurred_at' => now(),
        ]);

        Event::create([
            'tenant_id' => $tenantB->id,
            'event_type' => 'IncidentCreated',
            'aggregate_type' => 'Incident',
            'aggregate_id' => 4001,
            'user_id' => null,
            'payload' => ['incident_number' => 'INC-TB-4001', 'attributes' => ['status' => 'open']],
            'metadata' => ['scope' => 'tenant-b'],
            'version' => 1,
            'occurred_at' => now(),
        ]);

        $response = $this->actingAs($superadmin, 'web')
            ->getJson('/api/dashboard/feed?tenant_id='.$tenantA->id);

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.events.0.metadata.scope', 'tenant-a');
    }

    public function test_read_models_returns_tenant_scoped_projections_and_snapshots(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $userA = $this->createUserWithDashboardPermissions($tenantA->id);

        \App\Models\EventProjection::query()->create([
            'tenant_id' => $tenantA->id,
            'projection_name' => 'contracts_summary',
            'source_event_type' => 'ContractCreated',
            'last_processed_event_id' => 10,
            'last_processed_version' => 1,
            'projection_state' => [
                'event_count' => 3,
                'last_event_type' => 'ContractCreated',
            ],
            'is_active' => true,
        ]);

        \App\Models\EventProjection::query()->create([
            'tenant_id' => $tenantB->id,
            'projection_name' => 'incidents_summary',
            'source_event_type' => 'IncidentCreated',
            'last_processed_event_id' => 20,
            'last_processed_version' => 2,
            'projection_state' => [
                'event_count' => 4,
                'last_event_type' => 'IncidentCreated',
            ],
            'is_active' => true,
        ]);

        \App\Models\EventSnapshot::query()->create([
            'tenant_id' => $tenantA->id,
            'aggregate_type' => 'Contract',
            'aggregate_id' => 1001,
            'version' => 2,
            'state' => ['status' => 'done'],
            'created_at' => now(),
        ]);

        \App\Models\EventSnapshot::query()->create([
            'tenant_id' => $tenantB->id,
            'aggregate_type' => 'Incident',
            'aggregate_id' => 2002,
            'version' => 5,
            'state' => ['status' => 'open'],
            'created_at' => now(),
        ]);

        $this->actingAs($userA, 'web')
            ->getJson('/api/dashboard/read-models')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tables_available', true)
            ->assertJsonCount(1, 'data.projections')
            ->assertJsonCount(1, 'data.snapshots')
            ->assertJsonPath('data.projections.0.projection_name', 'contracts_summary')
            ->assertJsonPath('data.snapshots.0.aggregate_type', 'Contract')
            ->assertJsonPath('data.projections_pagination.total', 1)
            ->assertJsonPath('data.snapshots_pagination.total', 1);

        $this->actingAs($userA, 'web')
            ->getJson('/api/dashboard/read-models?projection_name=contracts&projection_active=active&snapshot_aggregate_type=Contract&per_page=5')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.projections')
            ->assertJsonCount(1, 'data.snapshots');
    }

    public function test_superadmin_summary_is_global_across_all_tenants_by_default(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $superadmin = $this->createSuperadminWithDashboardPermissions($tenantA->id);

        Contract::create([
            'tenant_id' => $tenantA->id,
            'contract_number' => 'CNT-SA-001',
            'title' => 'Tenant A contract',
            'status' => 'done',
            'priority' => 'high',
            'sla_status' => 'on_track',
        ]);

        Contract::create([
            'tenant_id' => $tenantB->id,
            'contract_number' => 'CNT-SB-001',
            'title' => 'Tenant B contract 1',
            'status' => 'in_progress',
            'priority' => 'medium',
            'sla_status' => 'at_risk',
        ]);

        Contract::create([
            'tenant_id' => $tenantB->id,
            'contract_number' => 'CNT-SB-002',
            'title' => 'Tenant B contract 2',
            'status' => 'blocked',
            'priority' => 'critical',
            'sla_status' => 'breached',
        ]);

        Incident::create([
            'tenant_id' => $tenantA->id,
            'incident_number' => 'INC-SA-001',
            'title' => 'Tenant A incident',
            'description' => 'Global dashboard should include this record.',
            'category' => 'operations',
            'severity' => 'high',
            'priority' => 'high',
            'status' => 'open',
            'reported_by' => $superadmin->id,
            'reported_at' => now(),
            'sla_breached' => false,
        ]);

        Incident::create([
            'tenant_id' => $tenantB->id,
            'incident_number' => 'INC-SB-001',
            'title' => 'Tenant B incident',
            'description' => 'Global dashboard should include this record.',
            'category' => 'operations',
            'severity' => 'critical',
            'priority' => 'critical',
            'status' => 'open',
            'reported_by' => $superadmin->id,
            'reported_at' => now(),
            'sla_breached' => true,
        ]);

        $this->actingAs($superadmin, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 3)
            ->assertJsonPath('data.kpis.contracts_done', 1)
            ->assertJsonPath('data.kpis.contracts_blocked', 1)
            ->assertJsonPath('data.kpis.incidents_total', 2)
            ->assertJsonPath('data.kpis.incidents_open', 2)
            ->assertJsonPath('data.kpis.incidents_sla_breached', 1);
    }

    public function test_admin_summary_can_be_global_with_all_tenants_flag(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $admin = $this->createAdminWithDashboardPermissions($tenantA->id);

        Contract::create([
            'tenant_id' => $tenantA->id,
            'contract_number' => 'CNT-AD-A-001',
            'title' => 'Tenant A contract',
            'status' => 'done',
            'priority' => 'high',
            'sla_status' => 'on_track',
        ]);

        Contract::create([
            'tenant_id' => $tenantB->id,
            'contract_number' => 'CNT-AD-B-001',
            'title' => 'Tenant B contract',
            'status' => 'in_progress',
            'priority' => 'medium',
            'sla_status' => 'at_risk',
        ]);

        // Default behavior without all_tenants remains tenant-scoped.
        $this->actingAs($admin, 'web')
            ->getJson('/api/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 1);

        // Explicit all_tenants returns global scope for Admin as well.
        $this->actingAs($admin, 'web')
            ->getJson('/api/dashboard/summary?all_tenants=1')
            ->assertStatus(200)
            ->assertJsonPath('data.kpis.contracts_total', 2);
    }

    private function createUserWithDashboardPermissions(int $tenantId): User
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'role' => 'viewer',
        ]);

        $role = Role::firstOrCreate([
            'name' => 'Dashboard Viewer',
        ], [
            'description' => 'Can view dashboard metrics',
            'level' => 1,
            'is_system' => false,
        ]);

        $contractsView = Permission::firstOrCreate([
            'resource' => 'contracts',
            'action' => 'view',
        ], [
            'name' => 'contracts.view',
            'description' => 'View contracts',
        ]);

        $incidentsView = Permission::firstOrCreate([
            'resource' => 'incidents',
            'action' => 'view',
        ], [
            'name' => 'incidents.view',
            'description' => 'View incidents',
        ]);

        $role->permissions()->syncWithoutDetaching([$contractsView->id, $incidentsView->id]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }

    private function createSuperadminWithDashboardPermissions(int $tenantId): User
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'role' => 'superadmin',
        ]);

        $role = Role::firstOrCreate([
            'name' => 'Superadmin',
        ], [
            'description' => 'Global superadmin role',
            'level' => 5,
            'is_system' => true,
        ]);

        $contractsView = Permission::firstOrCreate([
            'resource' => 'contracts',
            'action' => 'view',
        ], [
            'name' => 'contracts.view',
            'description' => 'View contracts',
        ]);

        $incidentsView = Permission::firstOrCreate([
            'resource' => 'incidents',
            'action' => 'view',
        ], [
            'name' => 'incidents.view',
            'description' => 'View incidents',
        ]);

        $role->permissions()->syncWithoutDetaching([$contractsView->id, $incidentsView->id]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }

    private function createAdminWithDashboardPermissions(int $tenantId): User
    {
        $user = User::factory()->create([
            'tenant_id' => $tenantId,
            'role' => 'admin',
        ]);

        $role = Role::firstOrCreate([
            'name' => 'Admin',
        ], [
            'description' => 'Tenant admin role',
            'level' => 4,
            'is_system' => true,
        ]);

        $contractsView = Permission::firstOrCreate([
            'resource' => 'contracts',
            'action' => 'view',
        ], [
            'name' => 'contracts.view',
            'description' => 'View contracts',
        ]);

        $incidentsView = Permission::firstOrCreate([
            'resource' => 'incidents',
            'action' => 'view',
        ], [
            'name' => 'incidents.view',
            'description' => 'View incidents',
        ]);

        $role->permissions()->syncWithoutDetaching([$contractsView->id, $incidentsView->id]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }
}
