// Covers: app/assets/page.tsx, app/assets/[id]/page.tsx,
//         app/assets/create/page.tsx, app/assets/[id]/edit/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAssetManagement = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mockPush, back: mockBack }),
  useParams: () => ({ id: "1" }),
}));

const mockMe = vi.hoisted(() => ({
  id: 1,
  name: "Admin",
  email: "a@test.local",
  tenant_id: 1,
  roles: [],
  permissions: [],
  tenant: { id: 1, name: "ACME" },
  can_filter_by_tenant: false,
}));
const emptyList = vi.hoisted(() => ({
  success: true,
  message: "",
  data: [],
  pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn().mockResolvedValue({ success: true, message: "", data: mockMe }),
}));

vi.mock("@/lib/api/assets", () => ({
  listAssets: vi.fn().mockResolvedValue(emptyList),
  getAssetById: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      id: 1,
      name: "Server A",
      asset_tag: "AST-001",
      status: "operational",
      category_id: 1,
      location: "DC-1",
    },
  }),
  updateAsset: vi.fn(),
  createAsset: vi.fn(),
  deleteAsset: vi.fn(),
  restoreAsset: vi.fn(),
  hardDeleteAsset: vi.fn(),
  retireAsset: vi.fn(),
  disposeAsset: vi.fn(),
  transferAsset: vi.fn(),
  reassignAsset: vi.fn(),
  getAssetAuditTrail: vi.fn().mockResolvedValue(emptyList),
}));

vi.mock("@/lib/api/assetCategories", () => ({
  listAssetCategories: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: [{ id: 1, name: "Servers" }],
  }),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/hooks/assets/useAssetDetail", () => ({
  useAssetDetail: vi.fn(),
}));

vi.mock("@/hooks/assets/useAssetManagement", () => ({
  useAssetManagement: mockUseAssetManagement,
}));

vi.mock("@/components/assets/detail/AssetMaintenanceLogSection", () => ({
  default: ({ canWrite }: { canWrite: boolean }) => (
    <div data-testid="maintenance-log-section">log-write:{String(canWrite)}</div>
  ),
}));

vi.mock("@/components/assets/detail/AssetMaintenanceScheduleSection", () => ({
  default: ({ canWrite }: { canWrite: boolean }) => (
    <div data-testid="maintenance-schedule-section">schedule-write:{String(canWrite)}</div>
  ),
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssetsPage from "@/app/assets/page";
import AssetDetailPage from "@/app/assets/[id]/page";
import CreateAssetPage from "@/app/assets/create/page";
import EditAssetPage from "@/app/assets/[id]/edit/page";
import { useAssetDetail } from "@/hooks/assets/useAssetDetail";
import { getMe } from "@/lib/api";
import { updateAsset } from "@/lib/api/assets";

const mockedUseAssetDetail = vi.mocked(useAssetDetail);

function createAssetManagementState(overrides: Record<string, unknown> = {}) {
  return {
    assets: [],
    loading: false,
    error: null,
    tenants: [],
    categories: [],
    canFilterByTenant: false,
    canCreateAssets: true,
    canEditAssets: true,
    sort: "",
    page: 1,
    perPage: 15,
    pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    filterInitialValues: {},
    isPageReadOnly: false,
    archivedTenantNameForBanner: null,
    editModalOpen: false,
    editModalLoading: false,
    editingAsset: null,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChangeAction: vi.fn(),
    handleSortChangeAction: vi.fn(),
    createAssetAction: vi.fn(),
    viewAssetDetailAction: vi.fn(),
    openEditAssetAction: vi.fn(),
    closeEditAssetAction: vi.fn(),
    submitEditAssetAction: vi.fn(),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("AssetsPage (list)", () => {
  beforeEach(() => {
    mockUseAssetManagement.mockReturnValue(createAssetManagementState());
  });

  it("renders the Assets heading", async () => {
    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Assets/i })).toBeTruthy();
    });
  });

  it("shows archived tenant name in muted style and disables Edit only for that row", () => {
    mockUseAssetManagement.mockReturnValue(
      createAssetManagementState({
        canFilterByTenant: true,
        isPageReadOnly: false,
        assets: [
          {
            id: 1,
            name: "Archived tenant asset",
            asset_tag: "AST-001",
            status: "operational",
            tenant: {
              id: 10,
              name: "Archived Tenant",
              deleted_at: "2026-03-01T00:00:00Z",
            },
          },
          {
            id: 2,
            name: "Active tenant asset",
            asset_tag: "AST-002",
            status: "operational",
            tenant: {
              id: 11,
              name: "Active Tenant",
              deleted_at: null,
            },
          },
        ],
      })
    );

    render(<AssetsPage />);

    expect(screen.getByText("Archived Tenant")).toHaveClass("text-dimmed");

    const archivedRow = screen.getByText("Archived tenant asset").closest("tr");
    const activeRow = screen.getByText("Active tenant asset").closest("tr");

    expect(archivedRow).toBeTruthy();
    expect(activeRow).toBeTruthy();

    expect(within(archivedRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(activeRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeEnabled();
  });

  it("shows status change reason field inside edit modal", async () => {
    mockUseAssetManagement.mockReturnValue(
      createAssetManagementState({
        editModalOpen: true,
        editingAsset: {
          id: 1,
          name: "Server A",
          asset_tag: "AST-001",
          status: "operational",
          category_id: 1,
          location: "DC-1",
        },
        categories: [{ id: 1, name: "Servers" }],
      })
    );

    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Status Change Reason/i)).toBeTruthy();
    });
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("AssetDetailPage", () => {
  beforeEach(() => {
    const detailState: ReturnType<typeof useAssetDetail> = {
      asset: {
        id: 1,
        name: "Server A",
        asset_tag: "AST-001",
        status: "operational",
        description: "Primary rack server",
      },
      loading: false,
      loadError: null,
      errorMessage: null,
      actionLoading: false,
      permissions: [],
      isReadOnly: false,
      canEditAssets: true,
      canDeleteAssets: true,
      activeTab: "overview",
      lifecycleAction: null,
      lifecycleModalOpen: false,
      auditItems: [],
      auditLoading: false,
      auditFilters: {},
      auditPage: 1,
      auditPerPage: 15,
      auditPagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
      clearErrorAction: vi.fn(),
      goBackAction: vi.fn(),
      setActiveTabAction: vi.fn(),
      openLifecycleModalAction: vi.fn(),
      closeLifecycleModalAction: vi.fn(),
      handleLifecycleConfirmAction: vi.fn(async () => {}),
      handleAuditFilterChangeAction: vi.fn(),
      setAuditPage: vi.fn(),
      setAuditPerPage: vi.fn(),
    };

    mockedUseAssetDetail.mockReturnValue(detailState);
  });

  it("renders heading and overview content from orchestration page", () => {
    render(<AssetDetailPage />);
    expect(screen.getByRole("heading", { name: /Server A/i })).toBeTruthy();
    expect(screen.getByText(/Asset #AST-001/i)).toBeTruthy();
    expect(screen.getByText(/Primary rack server/i)).toBeTruthy();
  });
});

describe("AssetDetailPage maintenance RBAC", () => {
  const baseState: ReturnType<typeof useAssetDetail> = {
    asset: {
      id: 1,
      name: "Server A",
      asset_tag: "AST-001",
      status: "operational",
      description: "Primary rack server",
    },
    loading: false,
    loadError: null,
    errorMessage: null,
    actionLoading: false,
    permissions: [],
    isReadOnly: false,
    canEditAssets: true,
    canDeleteAssets: true,
    activeTab: "maintenance",
    lifecycleAction: null,
    lifecycleModalOpen: false,
    auditItems: [],
    auditLoading: false,
    auditFilters: {},
    auditPage: 1,
    auditPerPage: 15,
    auditPagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    clearErrorAction: vi.fn(),
    goBackAction: vi.fn(),
    setActiveTabAction: vi.fn(),
    openLifecycleModalAction: vi.fn(),
    closeLifecycleModalAction: vi.fn(),
    handleLifecycleConfirmAction: vi.fn(async () => {}),
    handleAuditFilterChangeAction: vi.fn(),
    setAuditPage: vi.fn(),
    setAuditPerPage: vi.fn(),
  };

  it("Technician has write access in maintenance sections", () => {
    mockedUseAssetDetail.mockReturnValue({
      ...baseState,
      permissions: [
        { resource: "assets", action: "log_maintenance" },
        { resource: "assets", action: "schedule_maintenance" },
      ],
    });

    render(<AssetDetailPage />);

    expect(screen.getByTestId("maintenance-log-section").textContent).toContain("log-write:true");
    expect(screen.getByTestId("maintenance-schedule-section").textContent).toContain("schedule-write:true");
  });

  it("Viewer has maintenance access in read-only mode", () => {
    mockedUseAssetDetail.mockReturnValue({
      ...baseState,
      permissions: [{ resource: "assets", action: "view" }],
    });

    render(<AssetDetailPage />);

    expect(screen.getByTestId("maintenance-log-section").textContent).toContain("log-write:false");
    expect(screen.getByTestId("maintenance-schedule-section").textContent).toContain("schedule-write:false");
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("CreateAssetPage", () => {
  it("renders without crashing", async () => {
    render(<CreateAssetPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Create New Asset/i })).toBeTruthy();
    });
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────
describe("EditAssetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders edit form with prefilled asset values", async () => {
    render(<EditAssetPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Asset/i })).toBeTruthy();
      expect(screen.getByText(/Asset #/i)).toBeTruthy();
      expect(screen.getByDisplayValue("Server A")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeTruthy();
    });
  });

  it("submits edit form and redirects to detail", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAsset).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 1 },
    } as Awaited<ReturnType<typeof updateAsset>>);

    render(<EditAssetPage />);
    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateAsset).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Server A", status: "operational" })
      );
      expect(mockPush).toHaveBeenCalledWith("/assets/1");
    });
  });

  it("shows API error when asset update fails", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAsset).mockRejectedValueOnce(new Error("Asset update failed"));

    render(<EditAssetPage />);
    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Asset update failed/i)).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("keeps form read-only for archived tenant", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        tenant: { ...mockMe.tenant, deleted_at: "2026-01-01T00:00:00Z" },
      },
    });

    render(<EditAssetPage />);

    const submitButton = await screen.findByRole("button", { name: /Saving.../i });
    expect(submitButton).toBeDisabled();
    expect(updateAsset).not.toHaveBeenCalled();
  });
});
