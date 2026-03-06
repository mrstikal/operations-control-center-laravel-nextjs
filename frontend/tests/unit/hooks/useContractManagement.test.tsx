import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useContractManagement } from "@/hooks/contracts/useContractManagement";
import type { Contract } from "@/lib/types";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/contracts", () => ({
  listContracts: vi.fn(),
  getContractById: vi.fn(),
  updateContract: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEvents: { tenantChanged: "tenant:changed" },
  getTenantContext: vi.fn(() => null),
}));

import { getMe } from "@/lib/api";
import { getContractById, listContracts, updateContract } from "@/lib/api/contracts";
import { listTenants } from "@/lib/api/tenants";

const sampleContract: Contract = {
  id: 7,
  title: "Service Renewal",
  status: "draft",
  priority: "medium",
  created_at: "2026-03-01T00:00:00Z",
};

describe("useContractManagement", () => {
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
          { resource: "contracts", action: "create" },
          { resource: "contracts", action: "edit" },
        ],
        roles: [{ id: 1, name: "Admin", level: 4, description: "" }],
        can_filter_by_tenant: false,
      },
    });

    vi.mocked(listContracts).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleContract],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    vi.mocked(getContractById).mockResolvedValue({
      success: true,
      message: "",
      data: sampleContract,
    });

    vi.mocked(updateContract).mockResolvedValue({
      success: true,
      message: "",
      data: { ...sampleContract, status: "approved" },
    });

    vi.mocked(listTenants).mockResolvedValue({
      success: true,
      message: "",
      data: [],
    });
  });

  it("loads contracts and exposes permission flags", async () => {
    const { result } = renderHook(() => useContractManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.contracts).toEqual([sampleContract]);
    expect(result.current.canCreateContracts).toBe(true);
    expect(result.current.canEditContracts).toBe(true);
  });

  it("resets page when filters and sort change", async () => {
    const { result } = renderHook(() => useContractManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
      result.current.handleFilterChangeAction({ status: "draft", search: "renewal" });
    });

    await waitFor(() =>
      expect(listContracts).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "draft", search: "renewal", page: 1 }),
        { skipTenantHeader: true }
      )
    );

    act(() => {
      result.current.handleSortChangeAction("priority:asc");
    });

    await waitFor(() =>
      expect(listContracts).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "priority:asc", page: 1 }),
        { skipTenantHeader: true }
      )
    );
  });

  it("opens edit modal and submits contract update", async () => {
    const { result } = renderHook(() => useContractManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openEditContractAction(sampleContract);
    });

    expect(getContractById).toHaveBeenCalledWith(sampleContract.id);
    expect(result.current.editModalOpen).toBe(true);

    await act(async () => {
      await result.current.submitEditContractAction({
        title: "Service Renewal",
        status: "approved",
        priority: "medium",
        budget: "1000",
        spent: "200",
      });
    });

    expect(updateContract).toHaveBeenCalledWith(
      sampleContract.id,
      expect.objectContaining({ status: "approved" })
    );
  });

  it("pushes tenant-scoped detail route in all-tenants mode", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Super Admin",
        email: "superadmin@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME" },
        permissions: [{ resource: "contracts", action: "edit" }],
        roles: [{ id: 1, name: "Superadmin", level: 5, description: "" }],
        can_filter_by_tenant: true,
      },
    });

    const crossTenantContract: Contract = {
      ...sampleContract,
      id: 11,
      tenant: { id: 2, name: "Globex" },
    };

    vi.mocked(listContracts).mockResolvedValueOnce({
      success: true,
      message: "",
      data: [crossTenantContract],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    const { result } = renderHook(() => useContractManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.viewContractDetailAction(crossTenantContract);
    });

    expect(mockPush).toHaveBeenCalledWith("/contracts/11?tenant_id=2");
  });

  it("uses contract tenant scope when opening edit modal in all-tenants mode", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Super Admin",
        email: "superadmin@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME" },
        permissions: [{ resource: "contracts", action: "edit" }],
        roles: [{ id: 1, name: "Superadmin", level: 5, description: "" }],
        can_filter_by_tenant: true,
      },
    });

    const crossTenantContract: Contract = {
      ...sampleContract,
      id: 11,
      tenant: { id: 2, name: "Globex" },
    };

    vi.mocked(listContracts).mockResolvedValueOnce({
      success: true,
      message: "",
      data: [crossTenantContract],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    vi.mocked(getContractById).mockResolvedValueOnce({
      success: true,
      message: "",
      data: crossTenantContract,
    });

    const { result } = renderHook(() => useContractManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openEditContractAction(crossTenantContract);
    });

    expect(getContractById).toHaveBeenCalledWith(
      crossTenantContract.id,
      { tenant_id: 2 },
      { skipTenantHeader: true }
    );
    expect(result.current.editModalOpen).toBe(true);
  });
});

