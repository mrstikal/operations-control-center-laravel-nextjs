import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api/assets", () => ({
  getAssetById: vi.fn(),
  getAssetAuditTrail: vi.fn(),
  retireAsset: vi.fn(),
  disposeAsset: vi.fn(),
  transferAsset: vi.fn(),
  reassignAsset: vi.fn(),
  deleteAsset: vi.fn(),
  restoreAsset: vi.fn(),
  hardDeleteAsset: vi.fn(),
}));

import { useAssetDetail } from "@/hooks/assets/useAssetDetail";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { deleteAsset, getAssetAuditTrail, getAssetById, retireAsset } from "@/lib/api/assets";
import type { Asset } from "@/lib/types";

const baseAsset: Asset = {
  id: 1,
  name: "Server A",
  asset_tag: "AST-001",
  status: "operational",
  description: "Rack server",
  location: "DC-A",
  assigned_to: { id: 3, name: "Alice" },
  created_at: "2026-03-01T00:00:00Z",
};

const editableUser = {
  user: {
    id: 1,
    tenant_id: 1,
    name: "Admin",
    email: "admin@test.local",
    tenant: { id: 1, name: "ACME" },
    permissions: [
      { resource: "assets", action: "edit" },
      { resource: "assets", action: "delete" },
    ],
  },
  loading: false,
  refreshAction: vi.fn(),
};

describe("useAssetDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue(editableUser as ReturnType<typeof useCurrentUser>);
    vi.mocked(getAssetById).mockResolvedValue({
      success: true,
      message: "",
      data: baseAsset,
    });
    vi.mocked(getAssetAuditTrail).mockResolvedValue({
      success: true,
      message: "",
      data: [],
      pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    });
  });

  it("loads asset detail and permissions", async () => {
    const { result } = renderHook(() => useAssetDetail(1));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.asset?.name).toBe("Server A");
    expect(result.current.canEditAssets).toBe(true);
    expect(result.current.canDeleteAssets).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("lazy-loads audit trail only after switching to audit tab", async () => {
    const { result } = renderHook(() => useAssetDetail(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getAssetAuditTrail).not.toHaveBeenCalled();

    act(() => {
      result.current.setActiveTabAction("audit");
    });

    await waitFor(() =>
      expect(getAssetAuditTrail).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ page: 1, per_page: 15 })
      )
    );
  });

  it("blocks lifecycle actions in read-only mode", async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      ...editableUser,
      user: {
        ...editableUser.user,
        tenant_archived: true,
      },
    } as ReturnType<typeof useCurrentUser>);

    const { result } = renderHook(() => useAssetDetail(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openLifecycleModalAction("retire");
    });

    expect(result.current.lifecycleModalOpen).toBe(false);
    expect(result.current.errorMessage).toBe("Tenant is archived, this page is read-only.");
  });

  it("redirects after soft delete lifecycle action", async () => {
    const { result } = renderHook(() => useAssetDetail(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openLifecycleModalAction("delete");
    });

    await act(async () => {
      await result.current.handleLifecycleConfirmAction({ reason: "Duplicate asset" });
    });

    expect(deleteAsset).toHaveBeenCalledWith(1, "Duplicate asset");
    expect(mockPush).toHaveBeenCalledWith("/assets");
  });

  it("updates local asset after retire action", async () => {
    vi.mocked(retireAsset).mockResolvedValue({
      success: true,
      message: "",
      data: { ...baseAsset, status: "retired" },
    });

    const { result } = renderHook(() => useAssetDetail(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openLifecycleModalAction("retire");
    });

    await act(async () => {
      await result.current.handleLifecycleConfirmAction({ reason: "End of life" });
    });

    expect(retireAsset).toHaveBeenCalledWith(1, "End of life", undefined);
    expect(result.current.asset?.status).toBe("retired");
  });
});
