export type UiKpis = {
  contracts_total: number;
  contracts_done: number;
  contracts_blocked: number;
  contracts_in_progress: number;
  contracts_sla_breached: number;
  contracts_overdue: number;
  active_contracts_value: number;
  incidents_total: number;
  incidents_open: number;
  incidents_escalated: number;
  incidents_sla_breached: number;
  budget_usage_percent: number;
  avg_incident_resolution_hours: number;
};

export type TenantFilterValue = "all" | number;
export type ArchiveStatus = "active" | "archived" | "all";
export type ProjectionActiveFilter = "all" | "active" | "inactive";
export type ActivitySeverity = "low" | "medium" | "high" | "critical";
