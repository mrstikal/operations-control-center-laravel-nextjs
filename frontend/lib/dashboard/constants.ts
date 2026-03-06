import type { DashboardReadModels } from "@/lib/api";
import type { UiKpis } from "@/lib/dashboard/types";

export const EMPTY_KPIS: UiKpis = {
  contracts_total: 0,
  contracts_done: 0,
  contracts_blocked: 0,
  contracts_in_progress: 0,
  contracts_sla_breached: 0,
  contracts_overdue: 0,
  active_contracts_value: 0,
  incidents_total: 0,
  incidents_open: 0,
  incidents_escalated: 0,
  incidents_sla_breached: 0,
  budget_usage_percent: 0,
  avg_incident_resolution_hours: 0,
};

export const EMPTY_READ_MODELS: DashboardReadModels = {
  tables_available: false,
  projections: [],
  snapshots: [],
  projections_pagination: null,
  snapshots_pagination: null,
};

export const READ_MODELS_PAGE_SIZE = 10;
