<?php

namespace App\Http\Controllers\Api;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Event;
use App\Models\Incident;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseApiController
{
    public function summary(): JsonResponse
    {
        $tenantId = $this->getTenantId();

        $data = [
            'kpi' => [
                'operational' => $this->getOperationalKpi($tenantId),
                'business' => $this->getBusinessKpi($tenantId),
            ],
            'summary' => $this->getQuickSummary($tenantId),
            'generated_at' => now()->toIso8601String(),
        ];

        return $this->success($data, 'Dashboard summary retrieved successfully');
    }

    /**
     * Get operational KPIs (incidents, SLA).
     */
    private function getOperationalKpi(int $tenantId): array
    {
        $incidents = Incident::query()->ofTenant($tenantId);

        return [
            'incidents_total' => (clone $incidents)->count(),
            'incidents_open' => (clone $incidents)->where('status', 'open')->count(),
            'incidents_in_progress' => (clone $incidents)->where('status', 'in_progress')->count(),
            'incidents_escalated' => (clone $incidents)->where('status', 'escalated')->count(),
            'incidents_resolved_today' => (clone $incidents)
                ->where('status', 'resolved')
                ->whereDate('resolved_at', today())
                ->count(),
            'sla_breached' => (clone $incidents)->where('sla_breached', true)->count(),
            'sla_at_risk' => (clone $incidents)
                ->where('sla_breached', false)
                ->whereNotNull('sla_resolution_deadline')
                ->whereRaw("sla_resolution_deadline <= ?", [now()->addHours(2)])
                ->whereIn('status', ['open', 'in_progress'])
                ->count(),
            'avg_response_time_minutes' => $this->calculateAvgResponseTime($tenantId),
            'avg_resolution_time_hours' => $this->calculateAvgResolutionTime($tenantId),
        ];
    }

    /**
     * Get business KPIs (contracts, budget).
     */
    private function getBusinessKpi(int $tenantId): array
    {
        $contracts = Contract::query()->ofTenant($tenantId);
        $now = now();

        $activeContracts = (clone $contracts)
            ->whereIn('status', ['approved', 'in_progress'])
            ->get();

        $totalBudget = $activeContracts->sum('budget');

        // Budget spent calculation - use spent field from contracts
        $doneContracts = (clone $contracts)->where('status', 'done')->get();
        $totalSpent = $doneContracts->isNotEmpty() ? $doneContracts->sum('spent') : 0;

        return [
            'contracts_total' => (clone $contracts)->count(),
            'contracts_active' => $activeContracts->count(),
            'contracts_pending' => (clone $contracts)->where('status', 'draft')->count(),
            'contracts_done' => $doneContracts->count(),
            'contracts_expiring_30_days' => (clone $contracts)
                ->whereIn('status', ['approved', 'in_progress'])
                ->whereBetween('due_date', [$now, $now->copy()->addDays(30)])
                ->count(),
            'contracts_overdue' => (clone $contracts)
                ->whereIn('status', ['approved', 'in_progress'])
                ->where('due_date', '<', $now)
                ->count(),
            'total_budget' => round($totalBudget, 2),
            'total_spent' => round($totalSpent, 2),
            'budget_remaining' => round($totalBudget - $totalSpent, 2),
            'budget_usage_percent' => $totalBudget > 0
                ? round(($totalSpent / $totalBudget) * 100, 2)
                : 0,
            'assets_total' => Asset::query()->ofTenant($tenantId)->count(),
            'assets_operational' => Asset::query()->ofTenant($tenantId)
                ->where('status', 'operational')
                ->count(),
            'assets_maintenance' => Asset::query()->ofTenant($tenantId)
                ->where('status', 'maintenance')
                ->count(),
        ];
    }

    /**
     * Get quick summary for alerts.
     */
    private function getQuickSummary(int $tenantId): array
    {
        return [
            'critical_incidents' => Incident::query()->ofTenant($tenantId)
                ->where('severity', 'critical')
                ->whereIn('status', ['open', 'in_progress', 'escalated'])
                ->count(),
            'pending_approvals' => Contract::query()->ofTenant($tenantId)
                ->where('status', 'pending')
                ->count(),
            'sla_at_risk' => Incident::query()->ofTenant($tenantId)
                ->where('sla_breached', false)
                ->whereNotNull('sla_resolution_deadline')
                ->where('sla_resolution_deadline', '<=', now()->addHours(2))
                ->whereIn('status', ['open', 'in_progress'])
                ->count(),
        ];
    }

    public function feed(): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $limit = request()->query('limit', 20);

        // Use Event model for timeline feed
        $events = Event::query()
            ->ofTenant($tenantId)
            ->with(['user:id,name,email'])
            ->orderBy('occurred_at', 'desc')
            ->limit($limit)
            ->get();

        $formatted = $events->map(function ($event) {
            return [
                'id' => $event->id,
                'type' => $event->event_type,
                'entity' => $event->aggregate_type,
                'entity_id' => $event->aggregate_id,
                'message' => $this->formatEventMessage($event),
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->name,
                ] : null,
                'severity' => $this->getEventSeverity($event),
                'occurred_at' => $event->occurred_at->toIso8601String(),
                'metadata' => $event->metadata,
            ];
        });

        return $this->success([
            'events' => $formatted,
            'total' => $formatted->count(),
        ], 'Dashboard feed retrieved successfully');
    }

    private function formatEventMessage(Event $event): string
    {
        $payload = $event->payload;

        return match ($event->event_type) {
            'ContractCreated' => "Contract {$payload['contract_number']} was created",
            'ContractStatusChanged' => "Contract status changed to {$payload['new_status']}",
            'IncidentCreated' => "Incident {$payload['incident_number']} was created",
            'IncidentStatusChanged' => "Incident status changed to {$payload['new_status']}",
            'IncidentAssigned' => "Incident assigned to user",
            'IncidentEscalated' => "Incident escalated to level {$payload['escalation_level']}",
            'AssetStatusChanged' => "Asset status changed to {$payload['new_status']}",
            default => $event->event_type,
        };
    }

    private function getEventSeverity(Event $event): string
    {
        $payload = $event->payload;

        return match ($event->event_type) {
            'IncidentCreated', 'IncidentEscalated' => $payload['severity'] ?? 'medium',
            'ContractStatusChanged' => $payload['new_status'] === 'expired' ? 'high' : 'low',
            default => 'low',
        };
    }

    private function calculateAvgResponseTime(int $tenantId): float
    {
        $incidents = Incident::query()
            ->ofTenant($tenantId)
            ->whereNotNull('acknowledged_at')
            ->whereNotNull('reported_at')
            ->get();

        if ($incidents->isEmpty()) {
            return 0.0;
        }

        $totalMinutes = $incidents->sum(function ($incident) {
            return $incident->reported_at->diffInMinutes($incident->acknowledged_at);
        });

        return round($totalMinutes / $incidents->count(), 2);
    }


    private function calculateAvgResolutionTime(int $tenantId): float
    {
        $resolved = Incident::query()
            ->ofTenant($tenantId)
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->get();

        if ($resolved->isEmpty()) {
            return 0.0;
        }

        $totalHours = $resolved->sum(function ($incident) {
            return $incident->created_at->diffInHours($incident->resolved_at);
        });

        return round($totalHours / $resolved->count(), 2);
    }
}

