<?php

namespace App\Services\Dashboard;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Event;
use App\Models\EventProjection;
use App\Models\Incident;
use App\Models\MaintenanceSchedule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * DashboardQueryService – all KPI, feed and monitoring query logic.
 *
 * Extracted from DashboardController to satisfy SRP.
 */
class DashboardQueryService
{
    // -------------------------------------------------------------------------
    // Operational KPIs
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function getOperationalKpi(?int $tenantId, $user = null): array
    {
        $projectionKpi = $this->getProjectionKpi($tenantId, 'incidents_summary', 'Incident', $user);

        if ($projectionKpi !== null) {
            return [
                'incidents_total' => (int) ($projectionKpi['incidents_total'] ?? 0),
                'incidents_open' => (int) ($projectionKpi['incidents_open'] ?? 0),
                'incidents_in_progress' => (int) ($projectionKpi['incidents_in_progress'] ?? 0),
                'incidents_escalated' => (int) ($projectionKpi['incidents_escalated'] ?? 0),
                'incidents_resolved_today' => (int) ($projectionKpi['incidents_resolved_today'] ?? 0),
                'sla_breached' => (int) ($projectionKpi['sla_breached'] ?? 0),
                'sla_at_risk' => $this->applyTenantScope(Incident::query(), $tenantId)
                    ->where('sla_breached', false)
                    ->whereNotNull('sla_resolution_deadline')
                    ->whereRaw('sla_resolution_deadline <= ?', [now()->addHours(2)])
                    ->whereIn('status', ['open', 'in_progress'])
                    ->count(),
                'avg_response_time_minutes' => $this->calculateAvgResponseTime($tenantId, $user),
                'avg_resolution_time_hours' => $this->calculateAvgResolutionTime($tenantId, $user),
            ];
        }

        $incidents = $this->applyTenantScope(Incident::query(), $tenantId);

        if ($user && ! $user->isAdmin()) {
            if ($user->hasRole('Technician')) {
                $incidents = $incidents->where(function ($q) use ($user): void {
                    $q->where('assigned_to', $user->id)->orWhere('status', 'open');
                });
            } elseif ($user->hasRole('Manager')) {
                $incidents = $incidents->where('assigned_to', $user->id);
            } elseif ($user->isViewerClient()) {
                return $this->emptyOperationalKpi();
            } elseif ($user->isViewerAuditor()) {
                $incidents = $incidents->where('assigned_to', $user->id);
            }
            // isViewerManagement → no additional filter
        }

        $today = today()->toDateString();
        $slaRiskDeadline = now()->addHours(2);

        $stats = (clone $incidents)
            ->selectRaw('COUNT(*) as incidents_total')
            ->selectRaw("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as incidents_open")
            ->selectRaw("SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as incidents_in_progress")
            ->selectRaw("SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as incidents_escalated")
            ->selectRaw("SUM(CASE WHEN status = 'resolved' AND DATE(resolved_at) = ? THEN 1 ELSE 0 END) as incidents_resolved_today", [$today])
            ->selectRaw('SUM(CASE WHEN sla_breached = ? THEN 1 ELSE 0 END) as sla_breached', [true])
            ->selectRaw("SUM(CASE WHEN sla_breached = ? AND sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline <= ? AND status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as sla_at_risk", [false, $slaRiskDeadline])
            ->first();

        return [
            'incidents_total' => (int) ($stats->incidents_total ?? 0),
            'incidents_open' => (int) ($stats->incidents_open ?? 0),
            'incidents_in_progress' => (int) ($stats->incidents_in_progress ?? 0),
            'incidents_escalated' => (int) ($stats->incidents_escalated ?? 0),
            'incidents_resolved_today' => (int) ($stats->incidents_resolved_today ?? 0),
            'sla_breached' => (int) ($stats->sla_breached ?? 0),
            'sla_at_risk' => (int) ($stats->sla_at_risk ?? 0),
            'avg_response_time_minutes' => $this->calculateAvgResponseTime($tenantId, $user),
            'avg_resolution_time_hours' => $this->calculateAvgResolutionTime($tenantId, $user),
        ];
    }

    // -------------------------------------------------------------------------
    // Business KPIs
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function getBusinessKpi(?int $tenantId, $user = null): array
    {
        $projectionKpi = $this->getProjectionKpi($tenantId, 'contracts_summary', 'Contract', $user);

        if ($projectionKpi !== null) {
            $totalBudget = round((float) ($projectionKpi['total_budget'] ?? 0), 2);
            $totalSpent = round((float) ($projectionKpi['total_spent'] ?? 0), 2);

            return [
                'contracts_total' => (int) ($projectionKpi['contracts_total'] ?? 0),
                'contracts_active' => (int) ($projectionKpi['contracts_active'] ?? 0),
                'contracts_pending' => (int) ($projectionKpi['contracts_pending'] ?? 0),
                'contracts_done' => (int) ($projectionKpi['contracts_done'] ?? 0),
                'contracts_blocked' => (int) ($projectionKpi['contracts_blocked'] ?? 0),
                'contracts_sla_breached' => (int) ($projectionKpi['contracts_sla_breached'] ?? 0),
                'contracts_expiring_30_days' => (int) ($projectionKpi['contracts_expiring_30_days'] ?? 0),
                'contracts_overdue' => (int) ($projectionKpi['contracts_overdue'] ?? 0),
                'total_budget' => $totalBudget,
                'total_spent' => $totalSpent,
                'budget_remaining' => round($totalBudget - $totalSpent, 2),
                'budget_usage_percent' => $totalBudget > 0
                    ? round(($totalSpent / $totalBudget) * 100, 2) : 0,
                'assets_total' => $this->getAssetCount($tenantId, $user),
                'assets_operational' => $this->getAssetCount($tenantId, $user, 'operational'),
                'assets_maintenance' => $this->getAssetCount($tenantId, $user, 'maintenance'),
            ];
        }

        $contracts = $this->applyTenantScope(Contract::query(), $tenantId);

        if ($user && ! $user->isAdmin()) {
            if ($user->hasRole('Technician')) {
                $contracts = $contracts->where('assigned_to', $user->id);
            } elseif ($user->hasRole('Manager')) {
                $contracts = $contracts->where('assigned_to', $user->id);
            } elseif ($user->isViewerClient()) {
                $contracts = $contracts->where('client_id', $user->id);
            } elseif ($user->isViewerAuditor()) {
                $contracts = $contracts->where('assigned_to', $user->id);
            }
            // isViewerManagement → no additional filter
        }

        $now = now();
        $expiringUntil = $now->copy()->addDays(30);

        $stats = (clone $contracts)
            ->selectRaw('COUNT(*) as contracts_total')
            ->selectRaw("SUM(CASE WHEN status IN ('approved', 'in_progress') THEN 1 ELSE 0 END) as contracts_active")
            ->selectRaw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as contracts_pending")
            ->selectRaw("SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as contracts_done")
            ->selectRaw("SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as contracts_blocked")
            ->selectRaw("SUM(CASE WHEN sla_status = 'breached' THEN 1 ELSE 0 END) as contracts_sla_breached")
            ->selectRaw("SUM(CASE WHEN status IN ('approved', 'in_progress') AND due_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as contracts_expiring_30_days", [$now, $expiringUntil])
            ->selectRaw("SUM(CASE WHEN status IN ('approved', 'in_progress') AND due_date < ? THEN 1 ELSE 0 END) as contracts_overdue", [$now])
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('approved', 'in_progress') THEN budget ELSE 0 END), 0) as total_budget")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'done' THEN spent ELSE 0 END), 0) as total_spent")
            ->first();

        $totalBudget = round((float) ($stats->total_budget ?? 0), 2);
        $totalSpent = round((float) ($stats->total_spent ?? 0), 2);

        return [
            'contracts_total' => (int) ($stats->contracts_total ?? 0),
            'contracts_active' => (int) ($stats->contracts_active ?? 0),
            'contracts_pending' => (int) ($stats->contracts_pending ?? 0),
            'contracts_done' => (int) ($stats->contracts_done ?? 0),
            'contracts_blocked' => (int) ($stats->contracts_blocked ?? 0),
            'contracts_sla_breached' => (int) ($stats->contracts_sla_breached ?? 0),
            'contracts_expiring_30_days' => (int) ($stats->contracts_expiring_30_days ?? 0),
            'contracts_overdue' => (int) ($stats->contracts_overdue ?? 0),
            'total_budget' => $totalBudget,
            'total_spent' => $totalSpent,
            'budget_remaining' => round($totalBudget - $totalSpent, 2),
            'budget_usage_percent' => $totalBudget > 0
                ? round(($totalSpent / $totalBudget) * 100, 2) : 0,
            'assets_total' => $this->getAssetCount($tenantId, $user),
            'assets_operational' => $this->getAssetCount($tenantId, $user, 'operational'),
            'assets_maintenance' => $this->getAssetCount($tenantId, $user, 'maintenance'),
        ];
    }

    // -------------------------------------------------------------------------
    // Quick summary / alerts
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function getQuickSummary(?int $tenantId, $user = null): array
    {
        $incidentQuery = $this->applyTenantScope(Incident::query(), $tenantId);
        $approvalQuery = $this->applyTenantScope(Contract::query(), $tenantId)->where('status', 'pending');

        if ($user && ! $user->isAdmin()) {
            if ($user->hasRole('Technician')) {
                $incidentQuery = $incidentQuery->where(function ($q) use ($user): void {
                    $q->where('assigned_to', $user->id)->orWhere('status', 'open');
                });
                $approvalQuery = $approvalQuery->where('assigned_to', $user->id);
            } elseif ($user->isViewerClient() || $user->hasRole('Viewer')) {
                return ['critical_incidents' => 0, 'pending_approvals' => 0, 'sla_at_risk' => 0];
            } elseif ($user->isViewerAuditor()) {
                $incidentQuery = $incidentQuery->where('assigned_to', $user->id);
                $approvalQuery = $approvalQuery->where('assigned_to', $user->id);
            }
            // Manager / isViewerManagement → no additional filter
        }

        $slaRiskDeadline = now()->addHours(2);

        $incidentStats = $incidentQuery
            ->selectRaw("SUM(CASE WHEN severity = 'critical' AND status IN ('open', 'in_progress', 'escalated') THEN 1 ELSE 0 END) as critical_incidents")
            ->selectRaw("SUM(CASE WHEN sla_breached = ? AND sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline <= ? AND status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as sla_at_risk", [false, $slaRiskDeadline])
            ->first();

        return [
            'critical_incidents' => (int) ($incidentStats->critical_incidents ?? 0),
            'pending_approvals' => (int) $approvalQuery->count(),
            'sla_at_risk' => (int) ($incidentStats->sla_at_risk ?? 0),
        ];
    }

    // -------------------------------------------------------------------------
    // Monitoring
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function getMonitoringMetrics(?int $tenantId): array
    {
        $overdueMaintenance = $this->getOverdueMaintenanceCount($tenantId);
        $apiErrors = $this->getApiErrorCountersLast24h();
        $failedJobs = $this->getFailedJobsLast24h();

        return [
            'overdue_maintenance' => $overdueMaintenance,
            'api_errors_last_24h' => $apiErrors,
            'job_failures_last_24h' => $failedJobs,
            'alerts' => $this->buildMonitoringAlerts($overdueMaintenance, $apiErrors, $failedJobs),
            'scope_note' => 'Overdue maintenance is tenant-scoped, API/job counters are global (last 24h).',
        ];
    }

    public function getOverdueMaintenanceCount(?int $tenantId): int
    {
        $query = MaintenanceSchedule::query()
            ->where('is_active', true)
            ->where('next_due_date', '<=', now());

        if ($tenantId !== null) {
            $query->whereHas('asset', fn ($q) => $q->where('tenant_id', $tenantId));
        }

        return $query->count();
    }

    /**
     * @return array{'4xx':int,'5xx':int,total:int}
     */
    public function getApiErrorCountersLast24h(): array
    {
        $now = now();
        $keys4xx = [];
        $keys5xx = [];

        for ($i = 0; $i < 24; $i++) {
            $hour = $now->copy()->subHours($i)->format('YmdH');
            $keys4xx[] = "monitoring:api_status:4xx:{$hour}";
            $keys5xx[] = "monitoring:api_status:5xx:{$hour}";
        }

        /** @var array<string,mixed> $values4xx */
        $values4xx = Cache::many($keys4xx);
        /** @var array<string,mixed> $values5xx */
        $values5xx = Cache::many($keys5xx);

        $errors4xx = (int) array_sum(array_map(static fn ($v): int => (int) ($v ?? 0), $values4xx));
        $errors5xx = (int) array_sum(array_map(static fn ($v): int => (int) ($v ?? 0), $values5xx));

        return ['4xx' => $errors4xx, '5xx' => $errors5xx, 'total' => $errors4xx + $errors5xx];
    }

    /**
     * @return array{maintenance:int,total:int}
     */
    public function getFailedJobsLast24h(): array
    {
        $from = now()->subDay();

        $total = DB::table('failed_jobs')->where('failed_at', '>=', $from)->count();

        $maintenance = DB::table('failed_jobs')
            ->where('failed_at', '>=', $from)
            ->where(function ($q): void {
                $q->where('payload', 'like', '%EvaluateMaintenanceSchedulesJob%')
                    ->orWhere('payload', 'like', '%DispatchTriggerNotificationsJob%');
            })
            ->count();

        return ['maintenance' => $maintenance, 'total' => $total];
    }

    /**
     * @param  array{'4xx':int,'5xx':int,total:int}  $apiErrors
     * @param  array{maintenance:int,total:int}  $failedJobs
     * @return array<int, array{code:string,severity:string,message:string,value:int}>
     */
    public function buildMonitoringAlerts(int $overdueMaintenance, array $apiErrors, array $failedJobs): array
    {
        $alerts = [];

        if ($overdueMaintenance > 0) {
            $alerts[] = [
                'code' => 'overdue_maintenance',
                'severity' => $overdueMaintenance >= 10 ? 'critical' : 'warning',
                'message' => 'Overdue maintenance schedules detected.',
                'value' => $overdueMaintenance,
            ];
        }

        if ($apiErrors['5xx'] > 0) {
            $alerts[] = [
                'code' => 'api_5xx',
                'severity' => $apiErrors['5xx'] >= 5 ? 'critical' : 'warning',
                'message' => 'API 5xx responses detected in the last 24 hours.',
                'value' => $apiErrors['5xx'],
            ];
        }

        if ($failedJobs['total'] > 0) {
            $alerts[] = [
                'code' => 'job_failures',
                'severity' => $failedJobs['total'] >= 3 ? 'critical' : 'warning',
                'message' => 'Failed queue jobs detected in the last 24 hours.',
                'value' => $failedJobs['total'],
            ];
        }

        return $alerts;
    }

    // -------------------------------------------------------------------------
    // Event feed helpers
    // -------------------------------------------------------------------------

    public function formatEventMessage(Event $event): string
    {
        $payload = $event->payload;

        return match ($event->event_type) {
            'ContractCreated' => "Contract {$payload['contract_number']} was created",
            'ContractStatusChanged' => "Contract status changed to {$payload['new_status']}",
            'IncidentCreated' => "Incident {$payload['incident_number']} was created",
            'IncidentStatusChanged' => "Incident status changed to {$payload['new_status']}",
            'IncidentAssigned' => 'Incident assigned to user',
            'IncidentEscalated' => "Incident escalated to level {$payload['escalation_level']}",
            'AssetStatusChanged' => "Asset status changed to {$payload['new_status']}",
            default => $event->event_type,
        };
    }

    public function getEventSeverity(Event $event): string
    {
        $payload = $event->payload;

        return match ($event->event_type) {
            'IncidentCreated', 'IncidentEscalated' => $payload['severity'] ?? 'medium',
            'ContractStatusChanged' => $payload['new_status'] === 'expired' ? 'high' : 'low',
            default => 'low',
        };
    }

    // -------------------------------------------------------------------------
    // Projection / read-model helpers
    // -------------------------------------------------------------------------

    public function getProjectionKpi(
        ?int $tenantId,
        string $projectionName,
        string $aggregateType,
        $user = null
    ): ?array {
        if ($tenantId === null || ! $this->canUseTenantWideProjection($user)) {
            return null;
        }

        $projection = EventProjection::query()
            ->where('tenant_id', $tenantId)
            ->where('projection_name', $projectionName)
            ->where('is_active', true)
            ->first();

        if (! $projection || ! $this->isProjectionFresh($tenantId, $aggregateType, $projection->last_processed_event_id)) {
            return null;
        }

        $state = is_array($projection->projection_state) ? $projection->projection_state : [];
        $kpi = $state['dashboard_kpi'] ?? null;

        if (! is_array($kpi) || $this->projectionLooksIncomplete($tenantId, $aggregateType, $kpi)) {
            return null;
        }

        return $kpi;
    }

    public function canUseTenantWideProjection($user = null): bool
    {
        if (! $user) {
            return true;
        }

        if ($user->isAdmin() || $user->isViewerManagement() || $user->hasRole('Dashboard Viewer')) {
            return true;
        }

        if ($user->hasRole('Technician') || $user->hasRole('Manager') || $user->isViewerClient() || $user->isViewerAuditor()) {
            return false;
        }

        return ! $user->hasRole('Viewer');
    }

    public function isProjectionFresh(?int $tenantId, string $aggregateType, int $lastProcessedEventId): bool
    {
        if ($tenantId === null) {
            return false;
        }

        $maxEventId = (int) Event::query()
            ->ofTenant($tenantId)
            ->where('aggregate_type', $aggregateType)
            ->max('id');

        return $maxEventId === 0 || $lastProcessedEventId >= $maxEventId;
    }

    public function projectionLooksIncomplete(?int $tenantId, string $aggregateType, array $kpi): bool
    {
        $expectedTotal = $this->getAggregateTotalFromDatabase($tenantId, $aggregateType);

        if ($expectedTotal === null) {
            return false;
        }

        $kpiTotalKey = match ($aggregateType) {
            'Contract' => 'contracts_total',
            'Incident' => 'incidents_total',
            'Asset' => 'assets_total',
            default => null,
        };

        if (! is_string($kpiTotalKey)) {
            return false;
        }

        return (int) ($kpi[$kpiTotalKey] ?? 0) < $expectedTotal;
    }

    public function getAggregateTotalFromDatabase(?int $tenantId, string $aggregateType): ?int
    {
        return match ($aggregateType) {
            'Contract' => $this->applyTenantScope(Contract::query(), $tenantId)->count(),
            'Incident' => $this->applyTenantScope(Incident::query(), $tenantId)->count(),
            'Asset' => $this->applyTenantScope(Asset::query(), $tenantId)->count(),
            default => null,
        };
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Apply tenant scope to a query builder.
     *
     * When tenantId is null (global superadmin view) the archive_status request
     * parameter is used to filter by tenant soft-delete status.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public function applyTenantScope(Builder $query, ?int $tenantId): Builder
    {
        if ($tenantId === null) {
            $archiveStatus = request('archive_status', 'active');

            if ($archiveStatus === 'archived') {
                return $query->whereHas('tenant', fn (Builder $q) => $q->whereNotNull($q->getModel()->qualifyColumn('deleted_at')));
            }

            if ($archiveStatus === 'active') {
                return $query->whereHas('tenant', fn (Builder $q) => $q->whereNull($q->getModel()->qualifyColumn('deleted_at')));
            }

            return $query; // 'all'
        }

        return $query->where('tenant_id', $tenantId);
    }

    public function getAssetCount(?int $tenantId, $user = null, ?string $status = null): int
    {
        $query = $this->applyTenantScope(Asset::query(), $tenantId);

        if ($status) {
            $query->where('status', $status);
        }

        if ($user && ! $user->isAdmin() && $user->hasRole('Technician')) {
            $query->where('assigned_to', $user->id);
        }

        return $query->count();
    }

    public function calculateAvgResponseTime(?int $tenantId, $user = null): float
    {
        $query = $this->applyTenantScope(Incident::query(), $tenantId)
            ->whereNotNull('acknowledged_at')
            ->whereNotNull('reported_at');

        if ($user && ! $user->isAdmin() && $user->hasRole('Technician')) {
            $query->where('assigned_to', $user->id);
        }

        $avg = $query
            ->selectRaw('AVG('.$this->durationDiffExpression('reported_at', 'acknowledged_at', 'minute').') as avg_minutes')
            ->value('avg_minutes');

        return $avg === null ? 0.0 : round((float) $avg, 2);
    }

    public function calculateAvgResolutionTime(?int $tenantId, $user = null): float
    {
        $query = $this->applyTenantScope(Incident::query(), $tenantId)
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at');

        if ($user && ! $user->isAdmin() && $user->hasRole('Technician')) {
            $query->where('assigned_to', $user->id);
        }

        $avg = $query
            ->selectRaw('AVG('.$this->durationDiffExpression('created_at', 'resolved_at', 'hour').') as avg_hours')
            ->value('avg_hours');

        return $avg === null ? 0.0 : round((float) $avg, 2);
    }

    public function durationDiffExpression(string $startColumn, string $endColumn, string $unit): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            return match ($unit) {
                'minute' => "FLOOR(EXTRACT(EPOCH FROM ({$endColumn} - {$startColumn})) / 60)",
                'hour' => "FLOOR(EXTRACT(EPOCH FROM ({$endColumn} - {$startColumn})) / 3600)",
                default => '0',
            };
        }

        if ($driver === 'sqlite') {
            return match ($unit) {
                'minute' => "CAST((strftime('%s', {$endColumn}) - strftime('%s', {$startColumn})) / 60 AS INTEGER)",
                'hour' => "CAST((strftime('%s', {$endColumn}) - strftime('%s', {$startColumn})) / 3600 AS INTEGER)",
                default => '0',
            };
        }

        return match ($unit) {
            'minute' => "TIMESTAMPDIFF(MINUTE, {$startColumn}, {$endColumn})",
            'hour' => "TIMESTAMPDIFF(HOUR, {$startColumn}, {$endColumn})",
            default => '0',
        };
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /** @return array<string, int|float> */
    private function emptyOperationalKpi(): array
    {
        return [
            'incidents_total' => 0,
            'incidents_open' => 0,
            'incidents_in_progress' => 0,
            'incidents_escalated' => 0,
            'incidents_resolved_today' => 0,
            'sla_breached' => 0,
            'sla_at_risk' => 0,
            'avg_response_time_minutes' => 0.0,
            'avg_resolution_time_hours' => 0.0,
        ];
    }
}
