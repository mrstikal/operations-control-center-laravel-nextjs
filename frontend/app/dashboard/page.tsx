"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { clearToken } from "@/lib/auth";
import {
  getContracts,
  getDashboardSummary,
  getDashboardFeed,
  getIncidents,
  getMe,
  type Contract,
  type Incident,
  type DashboardEvent,
  type DashboardSummary,
  type DashboardFeedEventApi,
} from "@/lib/api";
import { getEcho } from "@/lib/realtime";
import { useRouter } from "next/navigation";

const EMPTY_KPIS = {
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

type UiKpis = typeof EMPTY_KPIS;

function mapSummaryToUiKpis(summary?: DashboardSummary): UiKpis {
  if (!summary) return EMPTY_KPIS;

  const operational = summary.kpi?.operational;
  const business = summary.kpi?.business;

  if (!operational || !business) return EMPTY_KPIS;

  return {
    contracts_total: business.contracts_total ?? 0,
    contracts_done: business.contracts_done ?? 0,
    contracts_blocked: 0,
    contracts_in_progress: business.contracts_active ?? 0,
    contracts_sla_breached: 0,
    contracts_overdue: business.contracts_overdue ?? 0,
    active_contracts_value: business.total_budget ?? 0,
    incidents_total: operational.incidents_total ?? 0,
    incidents_open: operational.incidents_open ?? 0,
    incidents_escalated: operational.incidents_escalated ?? 0,
    incidents_sla_breached: operational.sla_breached ?? 0,
    budget_usage_percent: business.budget_usage_percent ?? 0,
    avg_incident_resolution_hours: operational.avg_resolution_time_hours ?? 0,
  };
}

function mapFeedToUiEvents(events?: DashboardFeedEventApi[]): DashboardEvent[] {
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

export default function DashboardPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feed, setFeed] = useState<DashboardEvent[]>([]);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(EMPTY_KPIS);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [meRes, summaryRes, feedRes, c, i] = await Promise.all([
          getMe(),
          getDashboardSummary(),
          getDashboardFeed(15),
          getContracts(5),
          getIncidents(5),
        ]);
        if (!mounted) return;
        setTenantId(meRes.data.tenant_id);
        setKpis(mapSummaryToUiKpis(summaryRes.data));
        setFeed(mapFeedToUiEvents(feedRes.data?.events));
        setContracts(c.data ?? []);
        setIncidents(i.data ?? []);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.message === "Unauthenticated.") {
          clearToken();
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Nepodarilo se nacist data dashboardu.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!tenantId) return;

    const echo = getEcho();
    if (!echo) return;

    const reload = async () => {
      try {
        const [summary, feedRes, c, i] = await Promise.all([
          getDashboardSummary(),
          getDashboardFeed(15),
          getContracts(5),
          getIncidents(5),
        ]);
        setKpis(mapSummaryToUiKpis(summary.data));
        setFeed(mapFeedToUiEvents(feedRes.data?.events));
        setContracts(c.data ?? []);
        setIncidents(i.data ?? []);
      } catch {
        // Keep current UI state on transient realtime errors.
      }
    };

    const contractsChannel = echo.private(`tenant.${tenantId}.contracts`);
    const incidentsChannel = echo.private(`tenant.${tenantId}.incidents`);
    const dashboardChannel = echo.private(`tenant.${tenantId}.dashboard`);

    contractsChannel.listen(".contract.updated", reload);
    contractsChannel.listen(".contract.created", reload);
    contractsChannel.listen(".contract.deleted", reload);
    contractsChannel.listen(".contract.status_changed", reload);

    incidentsChannel.listen(".incident.updated", reload);
    incidentsChannel.listen(".incident.created", reload);
    incidentsChannel.listen(".incident.deleted", reload);
    incidentsChannel.listen(".incident.escalated", reload);
    incidentsChannel.listen(".incident.closed", reload);

    dashboardChannel.listen(".dashboard.stats_updated", reload);

    return () => {
      echo.leave(`private-tenant.${tenantId}.contracts`);
      echo.leave(`private-tenant.${tenantId}.incidents`);
      echo.leave(`private-tenant.${tenantId}.dashboard`);
    };
  }, [tenantId]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <main className="container grid">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1>Operations Control Center</h1>
          <button onClick={logout} style={{ padding: "0.5rem 1rem" }}>Odhlásit</button>
        </div>

        {loading && <div className="card">Načítám dashboard...</div>}
        {error && <div className="card" style={{ color: "#f87171" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Operational KPIs */}
            <section>
              <h2 style={{ marginBottom: "1rem" }}>🎯 Operativní Metriky</h2>
              <div className="grid grid-4">
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>{kpis.contracts_total}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Zakázky celkem</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>{kpis.contracts_done}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Dokončené</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>{kpis.contracts_in_progress}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Probíhající</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ef4444" }}>{kpis.contracts_overdue}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Po termínu</div>
                </div>
              </div>

              <div className="grid grid-4" style={{ marginTop: "1rem" }}>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#8b5cf6" }}>{kpis.incidents_total}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Incidenty celkem</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>{kpis.incidents_open}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Otevřené</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ef4444" }}>{kpis.incidents_escalated}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Eskalované</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc2626" }}>{kpis.incidents_sla_breached}</div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Porušení SLA</div>
                </div>
              </div>
            </section>

            {/* Business KPIs */}
            <section style={{ marginTop: "2rem" }}>
              <h2 style={{ marginBottom: "1rem" }}>💼 Obchodní Metriky</h2>
              <div className="grid grid-3">
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                    {kpis.budget_usage_percent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Využití rozpočtu</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                    ${kpis.active_contracts_value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Hodnota aktivních zakázek</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#8b5cf6" }}>
                    {kpis.avg_incident_resolution_hours.toFixed(1)}h
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Průměrný čas řešení incidentu</div>
                </div>
              </div>
            </section>

            {/* Activity Timeline */}
            <section style={{ marginTop: "2rem" }}>
              <h2 style={{ marginBottom: "1rem" }}>📋 Aktivita</h2>
              <div className="card">
                {feed.length === 0 && <p style={{ color: "#9ca3af" }}>Žádné události</p>}
                {feed.map((event) => {
                  const typeColor = event.type === "contract" ? "#3b82f6" : "#8b5cf6";
                  const actionText = event.action === "created" ? "vytvořeno" : "aktualizováno";
                  const timestamp = new Date(event.timestamp);
                  const timeAgo = formatTimeAgo(timestamp);

                  return (
                    <div
                      key={`${event.type}-${event.id}`}
                      style={{
                        padding: "0.75rem",
                        borderBottom: "1px solid #374151",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              backgroundColor: typeColor,
                              color: "white",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.75rem",
                              fontWeight: "600"
                            }}
                          >
                            {event.reference}
                          </span>
                          {event.is_new && (
                            <span
                              style={{
                                backgroundColor: "#10b981",
                                color: "white",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}
                            >
                              NEW
                            </span>
                          )}
                          <span style={{ fontWeight: "500" }}>{event.title}</span>
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                          {actionText} • {event.status} • {timeAgo}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recent Items */}
            <section className="grid grid-2" style={{ marginTop: "2rem" }}>
              <div className="card">
                <h2>📄 Nedávné zakázky</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Název</th>
                      <th>Stav</th>
                      <th>Priorita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td>{c.contract_number}</td>
                        <td>{c.title}</td>
                        <td><span className="badge">{c.status}</span></td>
                        <td>{c.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>🚨 Nedávné incidenty</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Název</th>
                      <th>Závažnost</th>
                      <th>Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((i) => (
                      <tr key={i.id}>
                        <td>{i.incident_number}</td>
                        <td>{i.title}</td>
                        <td>{i.severity}</td>
                        <td><span className="badge">{i.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "právě teď";
  if (diffMinutes < 60) return `před ${diffMinutes}min`;
  if (diffHours < 24) return `před ${diffHours}h`;
  if (diffDays < 7) return `před ${diffDays}d`;

  return date.toLocaleDateString("cs-CZ");
}
