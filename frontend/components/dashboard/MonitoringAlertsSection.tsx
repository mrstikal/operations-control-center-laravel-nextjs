"use client";

type MonitoringPayload = {
  overdue_maintenance: number;
  api_errors_last_24h: { "4xx": number; "5xx": number; total: number };
  job_failures_last_24h: { maintenance: number; total: number };
  alerts: Array<{ code: string; severity: "info" | "warning" | "critical"; message: string; value: number }>;
  scope_note: string;
};

type MonitoringAlertsSectionProps = {
  monitoring: MonitoringPayload | null | undefined;
};

function severityClass(severity: "info" | "warning" | "critical"): string {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-800";
  if (severity === "warning") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-blue-300 bg-blue-50 text-blue-800";
}

export default function MonitoringAlertsSection({monitoring}: MonitoringAlertsSectionProps) {
  if (!monitoring) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Monitoring Alerts</h2>
      <div className="dashboard-card">
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-sm bg-slate-300 p-3">
            <p className="text-sm text-slate-600">Overdue maintenance</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{monitoring.overdue_maintenance}</p>
          </div>
          <div className="rounded-sm bg-slate-300 p-3">
            <p className="text-sm text-slate-600">API errors (24h)</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{monitoring.api_errors_last_24h.total}</p>
            <p className="text-sm text-slate-600">
              4xx: {monitoring.api_errors_last_24h["4xx"]} | 5xx: {monitoring.api_errors_last_24h["5xx"]}
            </p>
          </div>
          <div className="rounded-sm bg-slate-300 p-3">
            <p className="text-sm text-slate-600">Failed jobs (24h)</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{monitoring.job_failures_last_24h.total}</p>
            <p className="text-sm text-slate-600">Maintenance: {monitoring.job_failures_last_24h.maintenance}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {monitoring.alerts.length === 0 ? (
            <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              No active monitoring alerts.
            </div>
          ) : (
            monitoring.alerts.map((alert) => (
              <div key={alert.code} className={`rounded border p-3 text-sm ${severityClass(alert.severity)}`}>
                <span className="font-semibold">[{alert.severity.toUpperCase()}]</span> {alert.message} ({alert.value})
              </div>
            ))
          )}
        </div>

        <p className="mt-3 text-xs text-slate-700">{monitoring.scope_note}</p>
      </div>
    </section>
  );
}
