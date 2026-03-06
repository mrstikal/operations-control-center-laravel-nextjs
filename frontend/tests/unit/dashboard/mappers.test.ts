import { describe, expect, it } from "vitest";
import { mapSummaryToUiKpis, mapFeedToUiEvents, mapStatusToSeverity } from "@/lib/dashboard/mappers";
import type { DashboardFeedEventApi, DashboardSummary } from "@/lib/api";

const FULL_SUMMARY: DashboardSummary = {
  kpi: {
    operational: {
      incidents_total: 20,
      incidents_open: 5,
      incidents_in_progress: 3,
      incidents_escalated: 2,
      incidents_resolved_today: 4,
      sla_breached: 1,
      sla_at_risk: 0,
      avg_response_time_minutes: 30,
      avg_resolution_time_hours: 6,
    },
    business: {
      contracts_total: 50,
      contracts_active: 30,
      contracts_pending: 5,
      contracts_done: 10,
      contracts_blocked: 3,
      contracts_sla_breached: 2,
      contracts_expiring_30_days: 4,
      contracts_overdue: 7,
      total_budget: 1_000_000,
      total_spent: 400_000,
      budget_remaining: 600_000,
      budget_usage_percent: 40,
      assets_total: 80,
      assets_operational: 70,
      assets_maintenance: 10,
    },
  },
  summary: { critical_incidents: 2, pending_approvals: 3, sla_at_risk: 0 },
  generated_at: "2026-03-14T10:00:00Z",
};

describe("mapSummaryToUiKpis", () => {
  it("returns EMPTY_KPIS when summary is undefined", () => {
    const kpis = mapSummaryToUiKpis(undefined);
    expect(kpis.contracts_total).toBe(0);
    expect(kpis.incidents_total).toBe(0);
  });

  it("returns EMPTY_KPIS when kpi.operational is missing", () => {
    const kpis = mapSummaryToUiKpis({} as DashboardSummary);
    expect(kpis.contracts_total).toBe(0);
  });

  it("maps a full summary payload to all UiKpi fields", () => {
    const kpis = mapSummaryToUiKpis(FULL_SUMMARY);

    expect(kpis.contracts_total).toBe(50);
    expect(kpis.contracts_done).toBe(10);
    expect(kpis.contracts_blocked).toBe(3);
    expect(kpis.contracts_in_progress).toBe(30);
    expect(kpis.contracts_sla_breached).toBe(2);
    expect(kpis.contracts_overdue).toBe(7);
    expect(kpis.active_contracts_value).toBe(1_000_000);

    expect(kpis.incidents_total).toBe(20);
    expect(kpis.incidents_open).toBe(5);
    expect(kpis.incidents_escalated).toBe(2);
    expect(kpis.incidents_sla_breached).toBe(1);

    expect(kpis.budget_usage_percent).toBe(40);
    expect(kpis.avg_incident_resolution_hours).toBe(6);
  });

  it("falls back to 0 for optional missing business fields", () => {
    const summary: DashboardSummary = {
      ...FULL_SUMMARY,
      kpi: {
        ...FULL_SUMMARY.kpi,
        business: { ...FULL_SUMMARY.kpi.business, budget_usage_percent: undefined as unknown as number },
      },
    };

    const kpis = mapSummaryToUiKpis(summary);
    expect(kpis.budget_usage_percent).toBe(0);
  });
});

describe("mapFeedToUiEvents", () => {
  it("returns empty array when events is undefined", () => {
    expect(mapFeedToUiEvents(undefined)).toEqual([]);
  });

  it("returns empty array when events is empty", () => {
    expect(mapFeedToUiEvents([])).toEqual([]);
  });

  it("maps contract events correctly", () => {
    const events: DashboardFeedEventApi[] = [
      {
        id: 1,
        type: "contract.created",
        entity: "contract",
        entity_id: 100,
        message: "Contract alpha created",
        user: null,
        severity: "low",
        occurred_at: "2026-03-14T09:00:00Z",
        metadata: null,
      },
    ];

    const [event] = mapFeedToUiEvents(events);
    expect(event.type).toBe("contract");
    expect(event.action).toBe("created");
    expect(event.title).toBe("Contract alpha created");
    expect(event.reference).toBe("contract-100");
    expect(event.id).toBe(1);
    expect(event.is_new).toBe(false);
  });

  it("maps incident events correctly and defaults action to 'updated'", () => {
    const events: DashboardFeedEventApi[] = [
      {
        id: 2,
        type: "incident.escalated",
        entity: "incident",
        entity_id: 55,
        message: "Incident escalated",
        user: null,
        severity: "high",
        occurred_at: "2026-03-14T11:00:00Z",
        metadata: null,
      },
    ];

    const [event] = mapFeedToUiEvents(events);
    expect(event.type).toBe("incident");
    expect(event.action).toBe("updated");
    expect(event.status).toBe("high");
  });
});

describe("mapStatusToSeverity", () => {
  it.each(["critical", "high", "medium", "low"] as const)(
    "passes through known severity %s",
    (severity) => {
      expect(mapStatusToSeverity(severity)).toBe(severity);
    }
  );

  it("returns 'low' for unknown statuses", () => {
    expect(mapStatusToSeverity("unknown_status")).toBe("low");
    expect(mapStatusToSeverity("")).toBe("low");
    expect(mapStatusToSeverity("pending")).toBe("low");
  });

  it("is case-insensitive", () => {
    expect(mapStatusToSeverity("CRITICAL")).toBe("critical");
    expect(mapStatusToSeverity("High")).toBe("high");
  });
});

