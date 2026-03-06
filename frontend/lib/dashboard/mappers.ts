import type { DashboardEvent, DashboardFeedEventApi, DashboardSummary } from "@/lib/api";
import { EMPTY_KPIS } from "@/lib/dashboard/constants";
import type { ActivitySeverity, UiKpis } from "@/lib/dashboard/types";

export function mapSummaryToUiKpis(summary?: DashboardSummary): UiKpis {
  if (!summary) return EMPTY_KPIS;

  const operational = summary.kpi?.operational;
  const business = summary.kpi?.business as Record<string, number | undefined> | undefined;

  if (!operational || !business) return EMPTY_KPIS;

  return {
    contracts_total: business["contracts_total"] ?? 0,
    contracts_done: business["contracts_done"] ?? 0,
    contracts_blocked: business["contracts_blocked"] ?? 0,
    contracts_in_progress: business["contracts_active"] ?? 0,
    contracts_sla_breached: business["contracts_sla_breached"] ?? 0,
    contracts_overdue: business["contracts_overdue"] ?? 0,
    active_contracts_value: business["total_budget"] ?? 0,
    incidents_total: operational.incidents_total ?? 0,
    incidents_open: operational.incidents_open ?? 0,
    incidents_escalated: operational.incidents_escalated ?? 0,
    incidents_sla_breached: operational.sla_breached ?? 0,
    budget_usage_percent: business["budget_usage_percent"] ?? 0,
    avg_incident_resolution_hours: operational.avg_resolution_time_hours ?? 0,
  };
}

export function mapFeedToUiEvents(events?: DashboardFeedEventApi[]): DashboardEvent[] {
  if (!events?.length) return [];

  return events.map((event) => {
    const eventType = event.type?.toLowerCase() ?? "";
    const isContract = eventType.includes("contract");

    return {
      id: event.id,
      type: isContract ? "contract" : "incident",
      reference: `${event.entity}-${event.entity_id}`,
      title: event.message,
      status: event.severity,
      timestamp: event.occurred_at,
      is_new: false,
      action: eventType.includes("created") ? "created" : "updated",
    };
  });
}

export function mapStatusToSeverity(status: string): ActivitySeverity {
  const normalized = status.toLowerCase();

  if (["critical", "high", "medium", "low"].includes(normalized)) {
    return normalized as ActivitySeverity;
  }

  return "low";
}
