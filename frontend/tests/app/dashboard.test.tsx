import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDashboardData = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/dashboard/useDashboardData", () => ({
  useDashboardData: mockUseDashboardData,
}));

import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";

function createDashboardState(overrides: Record<string, unknown> = {}) {
  return {
    archiveStatus: "active",
    contracts: [],
    error: null,
    feed: [],
    handleArchiveStatusChange: vi.fn(),
    handleProjectionActiveFilterChange: vi.fn(),
    handleProjectionNameFilterChange: vi.fn(),
    handleSnapshotAggregateFilterChange: vi.fn(),
    handleTenantFilterChange: vi.fn(),
    incidents: [],
    isSuperadminUser: false,
    kpis: {
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
    },
    loading: false,
    me: {
      id: 1,
      name: "Admin",
      email: "admin@test.local",
      tenant_id: 1,
      roles: [{ id: 1, name: "Admin", level: 4, description: "" }],
      permissions: [],
      tenant: { id: 1, name: "ACME" },
      can_filter_by_tenant: false,
    },
    projectionActiveFilter: "all",
    projectionNameFilter: "",
    projectionsPage: 1,
    readModels: {
      tables_available: false,
      projections: [],
      snapshots: [],
      projections_pagination: null,
      snapshots_pagination: null,
    },
    readModelsError: null,
    setProjectionsPage: vi.fn(),
    setSnapshotsPage: vi.fn(),
    snapshotAggregateFilter: "",
    snapshotsPage: 1,
    tenantFilter: "all",
    tenantOptions: [{ id: "all", value: "all", label: "All tenants" }],
    tenantsLoading: false,
    totalProjectionPages: 1,
    totalSnapshotPages: 1,
    ...overrides,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseDashboardData.mockReturnValue(createDashboardState());
  });

  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: /Dashboard/i })).toBeInTheDocument();
  });

  it("shows a loading indicator when dashboard data is loading", () => {
    mockUseDashboardData.mockReturnValue(createDashboardState({ loading: true, me: null }));

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
  });
});
