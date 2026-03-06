<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('status', 'active')
            ->orderBy('id')
            ->get();

        if ($tenants->isEmpty()) {
            return;
        }

        foreach ($tenants as $tenant) {
            $schedules = $this->buildSchedulesForTenant($tenant->id, $tenant->name);

            foreach ($schedules as $schedule) {
                DB::table('notification_schedules')->updateOrInsert(
                    [
                        'tenant_id' => $schedule['tenant_id'],
                        'name' => $schedule['name'],
                    ],
                    [
                        'notification_type' => $schedule['notification_type'],
                        'trigger' => $schedule['trigger'],
                        'conditions' => json_encode($schedule['conditions'], JSON_UNESCAPED_SLASHES),
                        'recipients' => json_encode($schedule['recipients'], JSON_UNESCAPED_SLASHES),
                        'is_active' => $schedule['is_active'],
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }

    /**
     * Build deterministic schedule payloads per tenant.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildSchedulesForTenant(int $tenantId, string $tenantName): array
    {
        return [
            [
                'tenant_id' => $tenantId,
                'name' => 'Critical SLA escalation',
                'notification_type' => 'sla_breach',
                'trigger' => 'sla_breach',
                'conditions' => [
                    'schema_version' => 1,
                    'rules' => [
                        ['field' => 'sla_breached', 'operator' => 'eq', 'value' => true],
                        ['field' => 'severity', 'operator' => 'in', 'value' => ['high', 'critical']],
                    ],
                    'window' => ['lookback_minutes' => 15],
                ],
                'recipients' => [
                    'schema_version' => 1,
                    'roles' => ['Admin', 'Manager'],
                    'channels' => ['in_app'],
                    'dedupe' => [
                        'strategy' => 'per_user_per_trigger',
                        'ttl_minutes' => 15,
                    ],
                ],
                'is_active' => true,
            ],
            [
                'tenant_id' => $tenantId,
                'name' => 'Incident assignment alerts',
                'notification_type' => 'incident_assigned',
                'trigger' => 'incident_assigned',
                'conditions' => [
                    'schema_version' => 1,
                    'rules' => [
                        ['field' => 'status', 'operator' => 'in', 'value' => ['open', 'in_progress', 'escalated']],
                    ],
                    'window' => ['lookback_minutes' => 20],
                ],
                'recipients' => [
                    'schema_version' => 1,
                    'roles' => ['Technician', 'Manager'],
                    'channels' => ['in_app'],
                    'dedupe' => [
                        'strategy' => 'per_user_per_trigger',
                        'ttl_minutes' => 20,
                    ],
                ],
                'is_active' => true,
            ],
            [
                'tenant_id' => $tenantId,
                'name' => 'Maintenance due reminders',
                'notification_type' => 'maintenance_due',
                'trigger' => 'maintenance_due',
                'conditions' => [
                    'schema_version' => 1,
                    'rules' => [
                        ['field' => 'days_until_due', 'operator' => 'lte', 'value' => 7],
                    ],
                    'window' => ['lookback_minutes' => 60],
                ],
                'recipients' => [
                    'schema_version' => 1,
                    'roles' => ['Technician', 'Manager'],
                    'channels' => ['in_app'],
                    'dedupe' => [
                        'strategy' => 'per_user_per_trigger',
                        'ttl_minutes' => 60,
                    ],
                ],
                'is_active' => true,
            ],
            [
                'tenant_id' => $tenantId,
                'name' => 'Contract status watch',
                'notification_type' => 'contract_status_changed',
                'trigger' => 'contract_status_changed',
                'conditions' => [
                    'schema_version' => 1,
                    'rules' => [
                        ['field' => 'status', 'operator' => 'in', 'value' => ['blocked', 'in_progress', 'done']],
                    ],
                ],
                'recipients' => [
                    'schema_version' => 1,
                    'roles' => ['Admin', 'Manager'],
                    'channels' => ['in_app'],
                    'dedupe' => [
                        'strategy' => 'per_user_per_trigger',
                        'ttl_minutes' => 30,
                    ],
                ],
                'is_active' => true,
            ],
            [
                'tenant_id' => $tenantId,
                'name' => 'Executive pulse for '.$tenantName,
                'notification_type' => 'operations_digest',
                'trigger' => 'contract_status_changed',
                'conditions' => [
                    'schema_version' => 1,
                    'rules' => [
                        ['field' => 'priority', 'operator' => 'in', 'value' => ['high', 'critical']],
                    ],
                    'window' => ['lookback_minutes' => 45],
                ],
                'recipients' => [
                    'schema_version' => 1,
                    'roles' => ['Admin'],
                    'channels' => ['in_app'],
                    'dedupe' => [
                        'strategy' => 'global_per_trigger',
                        'ttl_minutes' => 45,
                    ],
                ],
                'is_active' => true,
            ],
        ];
    }
}
