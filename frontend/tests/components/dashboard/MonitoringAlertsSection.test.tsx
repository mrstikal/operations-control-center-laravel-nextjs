import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MonitoringAlertsSection from "@/components/dashboard/MonitoringAlertsSection";

const BASE_MONITORING = {
  overdue_maintenance: 3,
  api_errors_last_24h: { "4xx": 2, "5xx": 1, total: 3 },
  job_failures_last_24h: { maintenance: 0, total: 0 },
  alerts: [] as Array<{ code: string; severity: "info" | "warning" | "critical"; message: string; value: number }>,
  scope_note: "Scoped to tenant ACME",
};

describe("MonitoringAlertsSection", () => {
  it("returns nothing when monitoring data is null", () => {
    const { container } = render(<MonitoringAlertsSection monitoring={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns nothing when monitoring data is undefined", () => {
    const { container } = render(<MonitoringAlertsSection monitoring={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders numeric metrics from monitoring payload", () => {
    render(<MonitoringAlertsSection monitoring={BASE_MONITORING} />);

    // overdue_maintenance=3 AND api_errors total=3 both render "3"
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Overdue maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/API errors/i)).toBeInTheDocument();
    expect(screen.getByText(/Scoped to tenant ACME/i)).toBeInTheDocument();
  });

  it("shows 'no active alerts' state when alerts list is empty", () => {
    render(<MonitoringAlertsSection monitoring={BASE_MONITORING} />);

    expect(screen.getByText(/No active monitoring alerts/i)).toBeInTheDocument();
  });

  it("renders info severity alert", () => {
    render(
      <MonitoringAlertsSection
        monitoring={{
          ...BASE_MONITORING,
          alerts: [{ code: "info_001", severity: "info", message: "Deployment in progress", value: 1 }],
        }}
      />
    );

    expect(screen.getByText(/Deployment in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/INFO/i)).toBeInTheDocument();
  });

  it("renders warning severity alert", () => {
    render(
      <MonitoringAlertsSection
        monitoring={{
          ...BASE_MONITORING,
          alerts: [{ code: "warn_002", severity: "warning", message: "High memory usage", value: 82 }],
        }}
      />
    );

    expect(screen.getByText(/High memory usage/i)).toBeInTheDocument();
    expect(screen.getByText(/WARNING/i)).toBeInTheDocument();
  });

  it("renders critical severity alert", () => {
    render(
      <MonitoringAlertsSection
        monitoring={{
          ...BASE_MONITORING,
          alerts: [{ code: "crit_003", severity: "critical", message: "Database connection lost", value: 100 }],
        }}
      />
    );

    expect(screen.getByText(/Database connection lost/i)).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
  });

  it("renders multiple alerts of different severities", () => {
    render(
      <MonitoringAlertsSection
        monitoring={{
          ...BASE_MONITORING,
          alerts: [
            { code: "a1", severity: "critical", message: "SLA breached", value: 5 },
            { code: "a2", severity: "warning", message: "Latency elevated", value: 350 },
            { code: "a3", severity: "info", message: "Backup running", value: 1 },
          ],
        }}
      />
    );

    expect(screen.getByText(/SLA breached/i)).toBeInTheDocument();
    expect(screen.getByText(/Latency elevated/i)).toBeInTheDocument();
    expect(screen.getByText(/Backup running/i)).toBeInTheDocument();
    expect(screen.queryByText(/No active monitoring alerts/i)).not.toBeInTheDocument();
  });
});

