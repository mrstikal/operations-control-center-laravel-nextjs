import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetManagement } from "@/hooks/assets/useAssetManagement";
import type { Asset } from "@/lib/types";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/assets", () => ({
  listAssets: vi.fn(),
  getAssetById: vi.fn(),
  updateAsset: vi.fn(),
}));

vi.mock("@/lib/api/assetCategories", () => ({
  listAssetCategories: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEvents: { tenantChanged: "tenant:changed" },
  getTenantContext: vi.fn(() => null),
}));

import { getMe } from "@/lib/api";
import { listAssetCategories } from "@/lib/api/assetCategories";
import { getAssetById, listAssets, updateAsset } from "@/lib/api/assets";
import { listTenants } from "@/lib/api/tenants";

const sampleAsset: Asset = {
  id: 3,
  name: "Generator",
  status: "operational",
  asset_tag: "AST-003",
};

describe("useAssetManagement", () => {
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
          { resource: "assets", action: "create" },
          { resource: "assets", action: "edit" },
        ],
        roles: [{ id: 1, name: "Admin", level: 4, description: "" }],
        can_filter_by_tenant: false,
      },
    });

    vi.mocked(listAssets).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleAsset],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    vi.mocked(listAssetCategories).mockResolvedValue({
      success: true,
      message: "",
      data: [{ id: 1, name: "Machinery" }],
    });

    vi.mocked(getAssetById).mockResolvedValue({
      success: true,
      message: "",
      data: sampleAsset,
    });

    vi.mocked(updateAsset).mockResolvedValue({
      success: true,
      message: "",
      data: { ...sampleAsset, status: "maintenance" },
    });

    vi.mocked(listTenants).mockResolvedValue({
      success: true,
      message: "",
      data: [],
    });

  });

  it("loads assets and category options", async () => {
    const { result } = renderHook(() => useAssetManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.assets).toEqual([sampleAsset]);
    expect(result.current.categories).toHaveLength(1);
    expect(result.current.canCreateAssets).toBe(true);
    expect(result.current.canEditAssets).toBe(true);
  });

  it("resets page when filters/sort change", async () => {
    const { result } = renderHook(() => useAssetManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(4);
      result.current.handleFilterChangeAction({ status: "operational", search: "Generator" });
    });

    await waitFor(() =>
      expect(listAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "operational", search: "Generator", page: 1 }),
        { skipTenantHeader: true }
      )
    );

    act(() => {
      result.current.handleSortChangeAction("status:desc");
    });

    await waitFor(() =>
      expect(listAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "status:desc", page: 1 }),
        { skipTenantHeader: true }
      )
    );
  });

  it("opens edit modal and submits status update with reason", async () => {
    const { result } = renderHook(() => useAssetManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openEditAssetAction(sampleAsset);
    });

    expect(getAssetById).toHaveBeenCalledWith(sampleAsset.id);
    expect(result.current.editModalOpen).toBe(true);

    await act(async () => {
      await result.current.submitEditAssetAction({
        name: "Generator",
        asset_tag: "AST-003",
        category: "1",
        status: "maintenance",
        reason: "Maintenance schedule",
        location: "Plant A",
        description: "Updated",
      });
    });

    expect(updateAsset).toHaveBeenCalledWith(
      sampleAsset.id,
      expect.objectContaining({ status: "maintenance", reason: "Maintenance schedule" })
    );
  });

  it("requires reason when status changes", async () => {
    const { result } = renderHook(() => useAssetManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openEditAssetAction(sampleAsset);
    });

    await act(async () => {
      await result.current.submitEditAssetAction({
        name: "Generator",
        asset_tag: "AST-003",
        category: "1",
        status: "maintenance",
        reason: "   ",
        location: "Plant A",
        description: "Updated",
      });
    });

    expect(updateAsset).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Status change reason is required.");
  });
});

