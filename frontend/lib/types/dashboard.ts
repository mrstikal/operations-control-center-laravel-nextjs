export type DashboardSummary = {
  kpi: {
    operational: {
      incidents_total: number;
      incidents_open: number;
      incidents_in_progress: number;
      incidents_escalated: number;
      incidents_resolved_today: number;
      sla_breached: number;
      sla_at_risk: number;
      avg_response_time_minutes: number;
      avg_resolution_time_hours: number;
    };
    business: {
      contracts_total: number;
      contracts_active: number;
      contracts_pending: number;
      contracts_done: number;
      contracts_blocked: number;
      contracts_sla_breached: number;
      contracts_expiring_30_days: number;
      contracts_overdue: number;
      total_budget: number;
      total_spent: number;
      budget_remaining: number;
      budget_usage_percent: number;
      assets_total: number;
      assets_operational: number;
      assets_maintenance: number;
    };
  };
  summary: {
    critical_incidents: number;
    pending_approvals: number;
    sla_at_risk: number;
  };
  monitoring?: {
    overdue_maintenance: number;
    api_errors_last_24h: {
      "4xx": number;
      "5xx": number;
      total: number;
    };
    job_failures_last_24h: {
      maintenance: number;
      total: number;
    };
    alerts: Array<{
      code: string;
      severity: "info" | "warning" | "critical";
      message: string;
      value: number;
    }>;
    scope_note: string;
  };
  generated_at: string;
};

export type DashboardEvent = {
  id: number;
  type: "contract" | "incident";
  reference: string;
  title: string;
  status: string;
  timestamp: string;
  is_new: boolean;
  action: "created" | "updated";
};

export type DashboardFeedEventApi = {
  id: number;
  type: string;
  entity: string;
  entity_id: number;
  message: string;
  user: { id: number; name: string } | null;
  severity: string;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

export type DashboardFeed = {
  events: DashboardFeedEventApi[];
  total: number;
};

export type DashboardProjectionRow = {
  id: number;
  projection_name: string;
  source_event_type: string;
  last_processed_event_id: number;
  last_processed_version: number;
  is_active: boolean;
  event_count: number;
  last_event_type: string | null;
  updated_at: string | null;
};

export type DashboardSnapshotRow = {
  id: number;
  aggregate_type: string;
  aggregate_id: number;
  version: number;
  created_at: string | null;
};

export type DashboardReadModelsPagination = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

export type DashboardReadModels = {
  tables_available: boolean;
  projections: DashboardProjectionRow[];
  snapshots: DashboardSnapshotRow[];
  projections_pagination: DashboardReadModelsPagination | null;
  snapshots_pagination: DashboardReadModelsPagination | null;
};
