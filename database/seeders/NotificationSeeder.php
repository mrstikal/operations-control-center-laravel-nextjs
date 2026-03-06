<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationSeeder extends Seeder
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
            $context = $this->buildTenantContext($tenant->id);
            $notifications = $this->buildNotificationsForTenant($tenant->id, $tenant->name, $context);

            foreach ($notifications as $notification) {
                $this->persistNotification($notification);
            }
        }
    }

    /**
     * Collect per-tenant records used to craft realistic notification texts.
     *
     * @return array<string, mixed>
     */
    private function buildTenantContext(int $tenantId): array
    {
        $admin = User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'Admin'))
            ->first();

        $manager = User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'Manager'))
            ->first();

        $technician = User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'Technician'))
            ->first();

        $fallbackUser = User::where('tenant_id', $tenantId)
            ->orderBy('id')
            ->first();

        $incident = Incident::where('tenant_id', $tenantId)
            ->latest('updated_at')
            ->first();

        $criticalIncident = Incident::where('tenant_id', $tenantId)
            ->whereIn('severity', ['high', 'critical'])
            ->latest('updated_at')
            ->first();

        $contract = Contract::where('tenant_id', $tenantId)
            ->latest('updated_at')
            ->first();

        $breachedContract = Contract::where('tenant_id', $tenantId)
            ->where('sla_status', 'breached')
            ->latest('updated_at')
            ->first();

        $assetDue = Asset::where('tenant_id', $tenantId)
            ->whereNotNull('next_maintenance')
            ->where('next_maintenance', '<=', now()->addDays(7))
            ->latest('next_maintenance')
            ->first();

        return [
            'admin' => $admin ?? $fallbackUser,
            'manager' => $manager ?? $fallbackUser,
            'technician' => $technician ?? $fallbackUser,
            'incident' => $incident,
            'critical_incident' => $criticalIncident ?? $incident,
            'contract' => $contract,
            'breached_contract' => $breachedContract ?? $contract,
            'asset_due' => $assetDue,
        ];
    }

    /**
     * Build notification payloads that read like manually entered operations updates.
     *
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    private function buildNotificationsForTenant(int $tenantId, string $tenantName, array $context): array
    {
        $incident = $context['incident'];
        $criticalIncident = $context['critical_incident'];
        $contract = $context['contract'];
        $breachedContract = $context['breached_contract'];
        $assetDue = $context['asset_due'];

        $seededAt = now();

        $items = [];

        if ($context['manager']) {
            $items[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'incident_assigned',
                'title' => 'New incident requires triage',
                'message' => $criticalIncident
                    ? "{$criticalIncident->incident_number}: {$criticalIncident->title} was routed to your response queue."
                    : 'A high-priority incident was routed to your response queue.',
                'priority' => 'high',
                'notifiable_type' => $criticalIncident ? Incident::class : null,
                'notifiable_id' => $criticalIncident?->id,
                'action_url' => $criticalIncident ? "/incidents/{$criticalIncident->id}" : '/incidents',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'incident_assigned',
                    'severity' => $criticalIncident?->severity,
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(25),
            ];
        }

        if ($context['admin']) {
            $items[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'sla_breach',
                'title' => 'SLA breach needs escalation',
                'message' => $breachedContract
                    ? "Contract {$breachedContract->contract_number} breached SLA and is waiting for escalation sign-off."
                    : 'A tracked service contract breached SLA and is waiting for escalation sign-off.',
                'priority' => 'critical',
                'notifiable_type' => $breachedContract ? Contract::class : null,
                'notifiable_id' => $breachedContract?->id,
                'action_url' => $breachedContract ? "/contracts/{$breachedContract->id}" : '/contracts',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'sla_breach',
                    'sla_status' => $breachedContract?->sla_status,
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(42),
            ];
        }

        if ($context['technician']) {
            $daysUntilDue = $assetDue && $assetDue->next_maintenance
                ? (int) now()->diffInDays($assetDue->next_maintenance, false)
                : null;

            $items[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['technician']->id,
                'type' => 'maintenance_due',
                'title' => 'Maintenance window is approaching',
                'message' => $assetDue
                    ? "{$assetDue->name} is due for maintenance in ".($daysUntilDue ?? 0).' day(s).'
                    : 'One of your assigned assets is approaching its planned maintenance window.',
                'priority' => $daysUntilDue !== null && $daysUntilDue <= 1 ? 'high' : 'medium',
                'notifiable_type' => $assetDue ? Asset::class : null,
                'notifiable_id' => $assetDue?->id,
                'action_url' => $assetDue ? "/assets/{$assetDue->id}" : '/assets',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'maintenance_due',
                    'days_until_due' => $daysUntilDue,
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subMinutes(50),
                'created_at' => $seededAt->copy()->subHours(2),
            ];
        }

        if ($context['manager']) {
            $items[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'contract_status_changed',
                'title' => 'Contract status changed',
                'message' => $contract
                    ? "{$contract->contract_number} moved to status '{$contract->status}'. Please confirm operational impact."
                    : 'A managed contract changed status. Please confirm operational impact.',
                'priority' => 'medium',
                'notifiable_type' => $contract ? Contract::class : null,
                'notifiable_id' => $contract?->id,
                'action_url' => $contract ? "/contracts/{$contract->id}" : '/contracts',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'contract_status_changed',
                    'status' => $contract?->status,
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subMinutes(15),
                'created_at' => $seededAt->copy()->subHour(),
            ];
        }

        if ($context['admin']) {
            $items[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'operations_digest',
                'title' => 'End-of-shift operations pulse',
                'message' => "{$tenantName}: today's operations pulse is ready. Review unresolved incidents and pending approvals.",
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/dashboard',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'operations_digest',
                    'generated_for' => $tenantName,
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(5),
            ];
        }

        $items = array_merge(
            $items,
            $this->buildOperationalFeedNotifications($tenantId, $tenantName, $context, $seededAt)
        );

        return $items;
    }

    /**
     * Build additional role-specific feed notifications to keep seeded data rich.
     *
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    private function buildOperationalFeedNotifications(
        int $tenantId,
        string $tenantName,
        array $context,
        \Illuminate\Support\Carbon $seededAt
    ): array {
        $incident = $context['incident'];
        $contract = $context['contract'];
        $assetDue = $context['asset_due'];

        $extra = [];

        if ($context['manager']) {
            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'incident_briefing',
                'title' => 'Morning handover briefing',
                'message' => $incident
                    ? "Please review {$incident->incident_number} before the 09:00 stand-up."
                    : 'Please review overnight incidents before the 09:00 stand-up.',
                'priority' => 'medium',
                'notifiable_type' => $incident ? Incident::class : null,
                'notifiable_id' => $incident?->id,
                'action_url' => '/incidents',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'incident_briefing',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subHours(3)->subMinutes(20),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'workload_review',
                'title' => 'Capacity review reminder',
                'message' => 'Two engineers are above 85% utilization. Consider workload balancing for the afternoon shift.',
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/employees',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'workload_review',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subHours(2),
                'created_at' => $seededAt->copy()->subHours(4)->subMinutes(10),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'customer_update',
                'title' => 'Customer update requested',
                'message' => 'Please publish a short status note for the active high-priority incidents before noon.',
                'priority' => 'medium',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/incidents',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'customer_update',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(95),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['manager']->id,
                'type' => 'standup_note',
                'title' => 'Stand-up notes archived',
                'message' => 'The operations stand-up notes were archived. Capture any missing action owners before EOD.',
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/dashboard',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'standup_note',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subMinutes(115),
                'created_at' => $seededAt->copy()->subHours(3)->subMinutes(5),
            ];
        }

        if ($context['technician']) {
            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['technician']->id,
                'type' => 'asset_note',
                'title' => 'Field note follow-up',
                'message' => $assetDue
                    ? "Please add post-service notes for {$assetDue->asset_tag} after the maintenance window closes."
                    : 'Please add post-service notes to assets serviced in the previous shift.',
                'priority' => 'low',
                'notifiable_type' => $assetDue ? Asset::class : null,
                'notifiable_id' => $assetDue?->id,
                'action_url' => '/assets',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'asset_note',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subHours(1)->subMinutes(35),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['technician']->id,
                'type' => 'shift_handover',
                'title' => 'Shift handover checklist',
                'message' => 'Before clock-out, confirm toolbox inventory and lockout/tagout handover in the operations log.',
                'priority' => 'medium',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/shifts',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'shift_handover',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subMinutes(70),
                'created_at' => $seededAt->copy()->subHours(2)->subMinutes(40),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['technician']->id,
                'type' => 'parts_restock',
                'title' => 'Parts bin restock needed',
                'message' => 'The compressor gasket kit is below threshold. Please log a restock request today.',
                'priority' => 'medium',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/assets',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'parts_restock',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(88),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['technician']->id,
                'type' => 'safety_ack',
                'title' => 'Safety checklist acknowledged',
                'message' => 'Your lockout/tagout checklist was acknowledged by the supervisor. No open safety remarks.',
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/shifts',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'safety_ack',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subHours(5),
                'created_at' => $seededAt->copy()->subHours(5)->subMinutes(5),
            ];
        }

        if ($context['admin']) {
            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'approval_queue',
                'title' => 'Approval queue has pending items',
                'message' => $contract
                    ? "{$contract->contract_number} is still waiting for final approval after the latest status update."
                    : 'The approval queue still contains pending contract actions from the previous shift.',
                'priority' => 'medium',
                'notifiable_type' => $contract ? Contract::class : null,
                'notifiable_id' => $contract?->id,
                'action_url' => '/contracts',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'approval_queue',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subHours(1)->subMinutes(5),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'compliance_digest',
                'title' => 'Weekly compliance digest ready',
                'message' => "{$tenantName}: weekly audit highlights are ready for review before the steering meeting.",
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/dashboard',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'compliance_digest',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subHours(6),
                'created_at' => $seededAt->copy()->subHours(7)->subMinutes(10),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'risk_review',
                'title' => 'Risk review follow-up',
                'message' => 'Three unresolved high-risk items remained after yesterday\'s review. Please assign owners.',
                'priority' => 'high',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/dashboard',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'risk_review',
                ],
                'read' => false,
                'read_at' => null,
                'created_at' => $seededAt->copy()->subMinutes(55),
            ];

            $extra[] = [
                'tenant_id' => $tenantId,
                'user_id' => $context['admin']->id,
                'type' => 'vendor_coordination',
                'title' => 'Vendor coordination note',
                'message' => 'Maintenance vendor confirmed tomorrow\'s slot at 08:30. Keep the loading bay clear for access.',
                'priority' => 'low',
                'notifiable_type' => null,
                'notifiable_id' => null,
                'action_url' => '/assets',
                'data' => [
                    'source' => 'seeder.manual_sample',
                    'trigger' => 'vendor_coordination',
                ],
                'read' => true,
                'read_at' => $seededAt->copy()->subHours(9),
                'created_at' => $seededAt->copy()->subHours(9)->subMinutes(15),
            ];
        }

        return $extra;
    }

    /**
     * Idempotent insert/update for seeded notifications.
     *
     * @param  array<string, mixed>  $notification
     */
    private function persistNotification(array $notification): void
    {
        $values = [
            'priority' => $notification['priority'],
            'notifiable_type' => $notification['notifiable_type'],
            'notifiable_id' => $notification['notifiable_id'],
            'action_url' => $notification['action_url'],
            'data' => json_encode($notification['data'], JSON_UNESCAPED_SLASHES),
            'read' => $notification['read'],
            'read_at' => $notification['read_at'],
            'created_at' => $notification['created_at'],
        ];

        if (Schema::hasColumn('notifications', 'updated_at')) {
            $values['updated_at'] = now();
        }

        DB::table('notifications')->updateOrInsert(
            [
                'tenant_id' => $notification['tenant_id'],
                'user_id' => $notification['user_id'],
                'type' => $notification['type'],
                'title' => $notification['title'],
                'message' => $notification['message'],
            ],
            $values
        );
    }
}
