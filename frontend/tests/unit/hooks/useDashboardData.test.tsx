import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.hoisted(() => vi.fn());
const mockRouter = vi.hoisted(() => ({ replace: mockReplace }));
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockCanFilterByTenantContext = vi.hoisted(() => vi.fn());

const mockClearToken = vi.hoisted(() => vi.fn());
const mockGetTenantContext = vi.hoisted(() => vi.fn<() => number | null>(() => null));
const mockIsTenantContextAll = vi.hoisted(() => vi.fn(() => false));

const mockGetDashboardSummary = vi.hoisted(() => vi.fn());
const mockGetDashboardFeed = vi.hoisted(() => vi.fn());
const mockGetDashboardReadModels = vi.hoisted(() => vi.fn());
const mockGetContracts = vi.hoisted(() => vi.fn());
const mockGetIncidents = vi.hoisted(() => vi.fn());
const mockListTenants = vi.hoisted(() => vi.fn());

const mockUseDashboardRealtime = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/lib/tenantAccess", () => ({
  canFilterByTenantContext: mockCanFilterByTenantContext,
}));

vi.mock("@/lib/auth", () => ({
  authEvents: { tenantChanged: "tenant:changed" },
  clearToken: mockClearToken,
  getTenantContext: mockGetTenantContext,
  isTenantContextAll: mockIsTenantContextAll,
}));

vi.mock("@/lib/api", () => ({
  getDashboardSummary: mockGetDashboardSummary,
  getDashboardFeed: mockGetDashboardFeed,
  getDashboardReadModels: mockGetDashboardReadModels,
  getContracts: mockGetContracts,
  getIncidents: mockGetIncidents,
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: mockListTenants,
}));

vi.mock("@/hooks/dashboard/useDashboardRealtime", () => ({
  useDashboardRealtime: mockUseDashboardRealtime,
}));

import { useDashboardData } from "@/hooks/dashboard/useDashboardData";

const baseUser = {
  id: 11,
  tenant_id: 77,
  name: "Dashboard Admin",
  email: "admin@occ.local",
  can_filter_by_tenant: false,
  roles: [{ id: 2, name: "Admin", level: 4, description: "" }],
};

const summaryResponse = {
  success: true,
  message: "",
  data: {
    kpi: {
      operational: {
        incidents_total: 15,
        incidents_open: 3,
        incidents_in_progress: 2,
        incidents_escalated: 1,
        incidents_resolved_today: 4,
        sla_breached: 1,
        sla_at_risk: 0,
        avg_response_time_minutes: 25,
        avg_resolution_time_hours: 4.5,
      },
      business: {
        contracts_total: 12,
        contracts_active: 8,
        contracts_pending: 1,
        contracts_done: 3,
        contracts_blocked: 1,
        contracts_sla_breached: 2,
        contracts_expiring_30_days: 1,
        contracts_overdue: 2,
        total_budget: 500000,
        total_spent: 175000,
        budget_remaining: 325000,
        budget_usage_percent: 35,
        assets_total: 30,
        assets_operational: 25,
        assets_maintenance: 5,
      },
    },
    summary: {
      critical_incidents: 1,
      pending_approvals: 2,
      sla_at_risk: 0,
    },
    monitoring: {
      overdue_maintenance: 2,
      api_errors_last_24h: { "4xx": 1, "5xx": 0, total: 1 },
      job_failures_last_24h: { maintenance: 0, total: 0 },
      alerts: [],
      scope_note: "tenant scoped",
    },
    generated_at: "2026-03-14T10:00:00Z",
  },
};

const feedResponse = {
  success: true,
  message: "",
  data: {
    events: [
      {
        id: 101,
        type: "contract.created",
        entity: "contract",
        entity_id: 501,
        message: "Contract created",
        user: null,
        severity: "low",
        occurred_at: "2026-03-14T11:00:00Z",
        metadata: null,
      },
    ],
    total: 1,
  },
};

const readModelsResponse = {
  success: true,
  message: "",
  data: {
    tables_available: true,
    projections: [],
    snapshots: [],
    projections_pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
    snapshots_pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
  },
};

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCurrentUser.mockReturnValue({
      user: baseUser,
      loading: false,
      refreshAction: vi.fn(),
    });

    mockCanFilterByTenantContext.mockReturnValue(false);
    mockListTenants.mockResolvedValue({ success: true, message: "", data: [] });

    mockGetDashboardSummary.mockResolvedValue(summaryResponse);
    mockGetDashboardFeed.mockResolvedValue(feedResponse);
    mockGetDashboardReadModels.mockResolvedValue(readModelsResponse);
    mockGetContracts.mockResolvedValue({ success: true, message: "", data: [{ id: 1, title: "C-1" }] });
    mockGetIncidents.mockResolvedValue({ success: true, message: "", data: [{ id: 2, title: "I-1" }] });
  });

  it("loads dashboard data and maps responses into a single view model", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.kpis.contracts_total).toBe(12);
    expect(result.current.kpis.incidents_total).toBe(15);
    expect(result.current.feed).toEqual([
      expect.objectContaining({
        id: 101,
        type: "contract",
        action: "created",
        title: "Contract created",
      }),
    ]);
    expect(result.current.readModels.tables_available).toBe(true);
    expect(result.current.contracts).toEqual([{ id: 1, title: "C-1" }]);
    expect(result.current.incidents).toEqual([{ id: 2, title: "I-1" }]);

    expect(mockGetDashboardSummary).toHaveBeenCalled();
    expect(mockGetDashboardFeed).toHaveBeenCalled();
    expect(mockGetDashboardReadModels).toHaveBeenCalled();
    expect(mockGetContracts).toHaveBeenCalled();
    expect(mockGetIncidents).toHaveBeenCalled();
  });

  it("keeps empty UI state when API returns empty payloads", async () => {
    mockGetDashboardFeed.mockResolvedValue({ success: true, message: "", data: { events: [], total: 0 } });
    mockGetDashboardReadModels.mockResolvedValue({ success: true, message: "", data: null });
    mockGetContracts.mockResolvedValue({ success: true, message: "", data: null });
    mockGetIncidents.mockResolvedValue({ success: true, message: "", data: null });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.feed).toEqual([]);
    expect(result.current.contracts).toEqual([]);
    expect(result.current.incidents).toEqual([]);
    expect(result.current.readModels.projections).toEqual([]);
    expect(result.current.readModels.snapshots).toEqual([]);
  });

  it("surfaces API error state", async () => {
    mockGetDashboardSummary.mockRejectedValue(new Error("Dashboard API failed"));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Dashboard API failed");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockClearToken).not.toHaveBeenCalled();
  });

  it("passes tenantId and reload callbacks to useDashboardRealtime", async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockUseDashboardRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: baseUser.tenant_id,
        onReloadAllAction: expect.any(Function),
        onReloadReadModelsAction: expect.any(Function),
      })
    );
  });

  it("uses selected tenant context for realtime channel when tenant filtering is available", async () => {
    mockCanFilterByTenantContext.mockReturnValue(true);
    mockGetTenantContext.mockReturnValue(123);
    mockIsTenantContextAll.mockReturnValue(false);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockUseDashboardRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 123,
      })
    );
  });

  it("disables realtime tenant subscription in all-tenants scope", async () => {
    mockCanFilterByTenantContext.mockReturnValue(true);
    mockGetTenantContext.mockReturnValue(null);
    mockIsTenantContextAll.mockReturnValue(true);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockUseDashboardRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: null,
      })
    );
  });

  it("onReloadAllAction refreshes kpis when called", async () => {
    let capturedReload: (() => Promise<void>) | undefined;

    mockUseDashboardRealtime.mockImplementation(
      ({ onReloadAllAction }: { onReloadAllAction: () => Promise<void> }) => {
        capturedReload = onReloadAllAction;
      }
    );

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(capturedReload).toBeDefined();

    mockGetDashboardSummary.mockResolvedValueOnce({
      ...summaryResponse,
      data: {
        ...summaryResponse.data,
        kpi: {
          ...summaryResponse.data.kpi,
          business: { ...summaryResponse.data.kpi.business, contracts_total: 99 },
        },
      },
    });

    await act(async () => {
      await capturedReload!();
    });

    await waitFor(() => expect(result.current.kpis.contracts_total).toBe(99));
  }, 15_000);
});

