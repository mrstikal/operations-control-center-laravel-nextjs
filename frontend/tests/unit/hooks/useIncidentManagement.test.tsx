import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIncidentManagement } from "@/hooks/incidents/useIncidentManagement";
import type { Incident } from "@/lib/types";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/incidents", () => ({
  listIncidents: vi.fn(),
  getIncidentById: vi.fn(),
  updateIncident: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEvents: { tenantChanged: "tenant:changed" },
  getTenantContext: vi.fn(() => null),
}));

import { getMe } from "@/lib/api";
import { getIncidentById, listIncidents, updateIncident } from "@/lib/api/incidents";
import { listTenants } from "@/lib/api/tenants";

const sampleIncident: Incident = {
  id: 15,
  tenant_id: 2,
  title: "Datacenter outage",
  status: "open",
  severity: "high",
};

describe("useIncidentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getMe).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Admin",
        email: "admin@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME" },
        permissions: [
          { resource: "incidents", action: "create" },
          { resource: "incidents", action: "edit" },
        ],
        roles: [{ id: 1, name: "Admin", level: 4, description: "" }],
        can_filter_by_tenant: false,
      },
    });

    vi.mocked(listIncidents).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleIncident],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    vi.mocked(getIncidentById).mockResolvedValue({
      success: true,
      message: "",
      data: sampleIncident,
    });

    vi.mocked(updateIncident).mockResolvedValue({
      success: true,
      message: "",
      data: { ...sampleIncident, status: "in_progress" },
    });

    vi.mocked(listTenants).mockResolvedValue({
      success: true,
      message: "",
      data: [],
    });
  });

  it("loads incidents and exposes permissions flags", async () => {
    const { result } = renderHook(() => useIncidentManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incidents).toEqual([sampleIncident]);
    expect(result.current.canCreateIncidents).toBe(true);
    expect(result.current.canEditIncidents).toBe(true);
  });

  it("resets page when filters/sort are changed", async () => {
    const { result } = renderHook(() => useIncidentManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setPage(3);
      result.current.handleFilterChangeAction({ status: "open", search: "outage" });
    });

    await waitFor(() =>
      expect(listIncidents).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "open", search: "outage", page: 1 }),
        { skipTenantHeader: true }
      )
    );

    await act(async () => {
      result.current.handleSortChangeAction("severity:desc");
    });

    await waitFor(() =>
      expect(listIncidents).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "severity:desc", page: 1 }),
        { skipTenantHeader: true }
      )
    );
  });

  it("opens edit modal and submits incident update", async () => {
    const { result } = renderHook(() => useIncidentManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openEditIncidentAction(sampleIncident);
    });

    expect(getIncidentById).toHaveBeenCalledWith(
      sampleIncident.id,
      { tenant_id: 2 },
      { skipTenantHeader: true }
    );
    expect(result.current.editModalOpen).toBe(true);

    await act(async () => {
      await result.current.submitEditIncidentAction({
        title: "Datacenter outage",
        description: "Primary region unavailable",
        category: "infrastructure",
        severity: "high",
        priority: "urgent",
        status: "in_progress",
      });
    });

    expect(updateIncident).toHaveBeenCalledWith(
      sampleIncident.id,
      expect.objectContaining({ status: "in_progress" })
    );
  });

  it("builds tenant-scoped details route in all-tenants context", async () => {
    const { result } = renderHook(() => useIncidentManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.viewIncidentDetailAction(sampleIncident);
    });

    expect(mockPush).toHaveBeenCalledWith(`/incidents/${sampleIncident.id}?tenant_id=2`);
  });
});

