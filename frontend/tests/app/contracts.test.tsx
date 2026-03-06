// Covers: app/contracts/page.tsx, app/contracts/[id]/page.tsx,
//         app/contracts/create/page.tsx, app/contracts/[id]/edit/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseContractManagement = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());
const mockSearchParamsGet = vi.hoisted(() => vi.fn<(key: string) => string | null>(() => null));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mockPush, back: mockBack }),
  useParams: () => ({ id: "1" }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
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

vi.mock("@/lib/api/contracts", () => ({
  listContracts: vi.fn().mockResolvedValue(emptyList),
  getContractById: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      id: 1,
      title: "Test",
      contract_number: "C-001",
      status: "draft",
      priority: "medium",
      created_at: "",
    },
  }),
  updateContract: vi.fn(),
  approveContract: vi.fn(),
  deleteContract: vi.fn(),
  restoreContract: vi.fn(),
  hardDeleteContract: vi.fn(),
  createContract: vi.fn(),
  createContractIncident: vi.fn(),
  updateContractIncident: vi.fn(),
  deleteContractIncident: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/hooks/contracts/useContractDetail", () => ({
  useContractDetail: vi.fn(),
}));

vi.mock("@/hooks/contracts/useContractManagement", () => ({
  useContractManagement: mockUseContractManagement,
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractsPage from "@/app/contracts/page";
import ContractDetailPage from "@/app/contracts/[id]/page";
import CreateContractPage from "@/app/contracts/create/page";
import EditContractPage from "@/app/contracts/[id]/edit/page";
import { useContractDetail } from "@/hooks/contracts/useContractDetail";
import { getMe } from "@/lib/api";
import {
  createContractIncident,
  deleteContractIncident,
  getContractById,
  updateContract,
  updateContractIncident,
} from "@/lib/api/contracts";
import { listTenants } from "@/lib/api/tenants";

const mockedUseContractDetail = vi.mocked(useContractDetail);

function createContractManagementState(overrides: Record<string, unknown> = {}) {
  return {
    contracts: [],
    loading: false,
    error: null,
    tenants: [],
    canFilterByTenant: false,
    canCreateContracts: true,
    canEditContracts: true,
    sort: "",
    page: 1,
    perPage: 15,
    pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    filterInitialValues: {},
    isPageReadOnly: false,
    archivedTenantNameForBanner: null,
    editModalOpen: false,
    editModalLoading: false,
    editingContract: null,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChangeAction: vi.fn(),
    handleSortChangeAction: vi.fn(),
    createContractAction: vi.fn(),
    viewContractDetailAction: vi.fn(),
    openEditContractAction: vi.fn(),
    closeEditModalAction: vi.fn(),
    submitEditContractAction: vi.fn(),
    ...overrides,
  };
}

function createContractDetailState(
  overrides: Partial<NonNullable<ReturnType<typeof useContractDetail>>> = {}
): NonNullable<ReturnType<typeof useContractDetail>> {
  return {
    contract: {
      id: 1,
      title: "Test Contract",
      contract_number: "C-001",
      description: "Contract description",
      status: "draft",
      priority: "medium",
      budget: 1000,
      spent: 250,
      created_at: "2026-03-01T00:00:00Z",
    },
    incidents: [],
    loading: false,
    loadError: null,
    errorMessage: null,
    actionLoading: false,
    contractEditLoading: false,
    incidentLoading: false,
    isReadOnly: false,
    permissions: [],
    canEditContracts: true,
    canDeleteContracts: true,
    canApproveContracts: true,
    isEditContractModalOpen: false,
    isEditIncidentModalOpen: false,
    isCreateIncidentModalOpen: false,
    incidentCreateForm: { title: "", description: "", severity: "medium", status: "open" },
    incidentEditForm: { title: "", description: "", severity: "medium", status: "open" },
    clearErrorAction: vi.fn(),
    goBackAction: vi.fn(),
    openEditContractModalAction: vi.fn(),
    closeEditContractModalAction: vi.fn(),
    handleApproveAction: vi.fn(async () => {}),
    handleSoftDeleteAction: vi.fn(async () => {}),
    handleHardDeleteAction: vi.fn(async () => {}),
    handleRestoreAction: vi.fn(async () => {}),
    openCreateIncidentModalAction: vi.fn(),
    closeCreateIncidentModalAction: vi.fn(),
    openEditIncidentModalAction: vi.fn(),
    closeEditIncidentModalAction: vi.fn(),
    updateIncidentCreateFormAction: vi.fn(),
    updateIncidentEditFormAction: vi.fn(),
    handleIncidentSubmitAction: vi.fn(async () => {}),
    handleIncidentUpdateAction: vi.fn(async () => {}),
    handleIncidentDeleteAction: vi.fn(async () => {}),
    handleContractEditSubmitAction: vi.fn(async () => {}),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("ContractsPage (list)", () => {
  beforeEach(() => {
    mockSearchParamsGet.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
    mockUseContractManagement.mockReturnValue(createContractManagementState());
  });

  it("renders the Contracts heading and empty state", async () => {
    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Contracts/i })).toBeTruthy();
      expect(screen.getByText(/No contracts found\./i)).toBeTruthy();
    });
  });

  it("shows archived tenant name in muted style and disables Edit only for that row", () => {
    mockUseContractManagement.mockReturnValue(
      createContractManagementState({
        canFilterByTenant: true,
        isPageReadOnly: false,
        contracts: [
          {
            id: 1,
            title: "Archived tenant contract",
            contract_number: "CNT-001",
            status: "draft",
            priority: "medium",
            created_at: "2026-03-15T10:00:00Z",
            tenant: {
              id: 10,
              name: "Archived Tenant",
              deleted_at: "2026-03-01T00:00:00Z",
            },
          },
          {
            id: 2,
            title: "Active tenant contract",
            contract_number: "CNT-002",
            status: "draft",
            priority: "medium",
            created_at: "2026-03-15T10:00:00Z",
            tenant: {
              id: 11,
              name: "Active Tenant",
              deleted_at: null,
            },
          },
        ],
      })
    );

    render(<ContractsPage />);

    expect(screen.getByText("Archived Tenant")).toHaveClass("text-dimmed");

    const archivedRow = screen.getByText("Archived tenant contract").closest("tr");
    const activeRow = screen.getByText("Active tenant contract").closest("tr");

    expect(archivedRow).toBeTruthy();
    expect(activeRow).toBeTruthy();

    expect(within(archivedRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(activeRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeEnabled();
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("ContractDetailPage", () => {
  beforeEach(() => {
    mockSearchParamsGet.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
    mockedUseContractDetail.mockReturnValue(createContractDetailState());
  });

  it("passes route id to detail hook and renders loading state", () => {
    mockedUseContractDetail.mockReturnValue(createContractDetailState({ loading: true }));

    render(<ContractDetailPage />);

    expect(mockedUseContractDetail).toHaveBeenCalledWith("1", undefined);
    expect(screen.getByText(/^Loading\.\.\.$/i)).toBeTruthy();
  });

  it("passes tenant scope from search params to the detail hook", () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === "tenant_id" ? "2" : null));

    render(<ContractDetailPage />);

    expect(mockedUseContractDetail).toHaveBeenCalledWith("1", { tenantId: 2 });
  });

  it("renders heading and related incidents section from the orchestration page", () => {
    render(<ContractDetailPage />);
    expect(screen.getByRole("heading", { name: /Test Contract/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Related Incidents/i })).toBeTruthy();
    expect(screen.getByText(/No related incidents yet\./i)).toBeTruthy();
  });

  it("renders error and not-found fallback branches", async () => {
    const user = userEvent.setup();
    const goBackAction = vi.fn();

    mockedUseContractDetail
      .mockReturnValueOnce(createContractDetailState({ loadError: "Load failed", goBackAction }))
      .mockReturnValueOnce(createContractDetailState({ contract: null, goBackAction }));

    const { rerender } = render(<ContractDetailPage />);

    expect(screen.getByText(/Load failed/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Back$/i }));
    expect(goBackAction).toHaveBeenCalledTimes(1);

    rerender(<ContractDetailPage />);

    expect(screen.getByText(/Contract not found/i)).toBeTruthy();
  });

  it("wires role-based actions, dismiss flow and incident panel actions", async () => {
    const user = userEvent.setup();
    const clearErrorAction = vi.fn();
    const openEditContractModalAction = vi.fn();
    const handleApproveAction = vi.fn(async () => {});
    const handleSoftDeleteAction = vi.fn(async () => {});
    const handleHardDeleteAction = vi.fn(async () => {});
    const openCreateIncidentModalAction = vi.fn();
    const openEditIncidentModalAction = vi.fn();
    const handleIncidentDeleteAction = vi.fn(async () => {});
    const incident = {
      id: 77,
      title: "Network breach",
      description: "Traffic exceeded baseline",
      severity: "high" as const,
      status: "open" as const,
      reported_at: "2026-03-03T10:00:00Z",
    };

    mockedUseContractDetail.mockReturnValue(
      createContractDetailState({
        errorMessage: "Action failed",
        incidents: [incident],
        clearErrorAction,
        openEditContractModalAction,
        handleApproveAction,
        handleSoftDeleteAction,
        handleHardDeleteAction,
        openCreateIncidentModalAction,
        openEditIncidentModalAction,
        handleIncidentDeleteAction,
      })
    );

    render(<ContractDetailPage />);

    expect(screen.getByText(/Action failed/i)).toBeTruthy();
    expect(screen.getByText(/Timeline/i)).toBeTruthy();
    expect(screen.getByText(/Budget Usage/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Dismiss/i }));
    await user.click(screen.getByRole("button", { name: /Approve/i }));
    await user.click(screen.getAllByRole("button", { name: /^Edit$/i })[0]);
    await user.click(screen.getByRole("button", { name: /Soft Delete/i }));
    await user.click(screen.getByRole("button", { name: /Hard Delete/i }));
    await user.click(screen.getByRole("button", { name: /Add Incident/i }));
    await user.click(screen.getAllByRole("button", { name: /^Edit$/i })[1]);
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(clearErrorAction).toHaveBeenCalledTimes(1);
    expect(handleApproveAction).toHaveBeenCalledTimes(1);
    expect(openEditContractModalAction).toHaveBeenCalledTimes(1);
    expect(handleSoftDeleteAction).toHaveBeenCalledTimes(1);
    expect(handleHardDeleteAction).toHaveBeenCalledTimes(1);
    expect(openCreateIncidentModalAction).toHaveBeenCalledTimes(1);
    expect(openEditIncidentModalAction).toHaveBeenCalledWith(expect.objectContaining({ id: 77 }));
    expect(handleIncidentDeleteAction).toHaveBeenCalledWith(77);
  });

  it("shows restore action for deleted contracts", async () => {
    const user = userEvent.setup();
    const handleRestoreAction = vi.fn(async () => {});

    mockedUseContractDetail.mockReturnValue(
      createContractDetailState({
        contract: {
          id: 1,
          title: "Deleted Contract",
          contract_number: "C-999",
          description: "",
          status: "approved",
          priority: "high",
          budget: 1000,
          spent: 950,
          deleted_at: "2026-03-01T12:00:00Z",
          created_at: "2026-02-01T00:00:00Z",
        },
        canApproveContracts: false,
        handleRestoreAction,
      })
    );

    render(<ContractDetailPage />);

    expect(screen.getByText(/^Deleted$/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Soft Delete/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Restore/i }));

    expect(handleRestoreAction).toHaveBeenCalledTimes(1);
  });

  it("hides approve action when contract is not draft", () => {
    mockedUseContractDetail.mockReturnValue(
      createContractDetailState({
        canApproveContracts: true,
        contract: {
          id: 1,
          title: "Approved contract",
          contract_number: "C-111",
          status: "approved",
          priority: "medium",
          budget: 500,
          spent: 100,
          created_at: "2026-03-01T00:00:00Z",
        },
      })
    );

    render(<ContractDetailPage />);

    expect(screen.queryByRole("button", { name: /Approve/i })).toBeNull();
  });

  it("renders modals only when editing is allowed and page is not read-only", () => {
    const { rerender } = render(
      <ContractDetailPage />
    );

    mockedUseContractDetail.mockReturnValue(
      createContractDetailState({
        isEditContractModalOpen: true,
        isEditIncidentModalOpen: true,
        isCreateIncidentModalOpen: true,
        canEditContracts: true,
        isReadOnly: false,
      })
    );

    rerender(<ContractDetailPage />);

    expect(screen.getByRole("dialog", { name: /Edit Contract/i })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Edit Related Incident/i })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Add Related Incident/i })).toBeTruthy();

    mockedUseContractDetail.mockReturnValue(
      createContractDetailState({
        isEditContractModalOpen: true,
        isEditIncidentModalOpen: true,
        isCreateIncidentModalOpen: true,
        canEditContracts: true,
        isReadOnly: true,
      })
    );

    rerender(<ContractDetailPage />);

    expect(screen.queryByRole("dialog", { name: /Edit Contract/i })).toBeNull();
    expect(screen.queryByRole("dialog", { name: /Edit Related Incident/i })).toBeNull();
    expect(screen.queryByRole("dialog", { name: /Add Related Incident/i })).toBeNull();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("CreateContractPage", () => {
  it("renders unauthorized state when create permission is missing", async () => {
    render(<CreateContractPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Create Contract/i })).toBeTruthy();
      expect(
        screen.getByText(/You do not have permission to create contracts\./i)
      ).toBeTruthy();
    });
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────
describe("EditContractPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
    vi.mocked(getMe).mockResolvedValue({ success: true, message: "", data: mockMe });
    vi.mocked(getContractById).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 1,
        title: "Test",
        contract_number: "C-001",
        status: "draft",
        priority: "medium",
        created_at: "",
      },
    } as Awaited<ReturnType<typeof getContractById>>);
    vi.mocked(listTenants).mockResolvedValue({
      success: true,
      message: "",
      data: [],
    } as Awaited<ReturnType<typeof listTenants>>);
  });

  it("renders unauthorized state when edit permission is missing", async () => {
    render(<EditContractPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Contract/i })).toBeTruthy();
      expect(
        screen.getByText(/You do not have permission to edit contracts\./i)
      ).toBeTruthy();
    });
  });

  it("uses the back action from the unauthorized state", async () => {
    const user = userEvent.setup();

    render(<EditContractPage />);

    await user.click(await screen.findByRole("button", { name: /^Back$/i }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("renders edit form when edit permission is present", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });

    render(<EditContractPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Contract/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Update Contract/i })).toBeTruthy();
    });
  });

  it("loads tenant options and forwards tenant id and numeric fields on submit", async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockImplementation((key: string) => (key === "tenant_id" ? "2" : null));
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        can_filter_by_tenant: true,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });
    vi.mocked(getContractById).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        title: "Cross-tenant contract",
        contract_number: "C-777",
        description: "Shared services",
        priority: "high",
        status: "approved",
        budget: 1500,
        spent: 450,
        tenant: { id: 2, name: "Tenant B" },
        incidents: [],
        created_at: "2026-03-01T00:00:00Z",
      },
    } as Awaited<ReturnType<typeof getContractById>>);
    vi.mocked(listTenants).mockResolvedValueOnce({
      success: true,
      message: "",
      data: [
        { id: 1, name: "ACME" },
        { id: 2, name: "Tenant B" },
      ],
    } as Awaited<ReturnType<typeof listTenants>>);
    vi.mocked(updateContract).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 1 },
    } as Awaited<ReturnType<typeof updateContract>>);

    render(<EditContractPage />);

    expect(await screen.findByDisplayValue("Tenant B")).toBeTruthy();
    expect(getContractById).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });

    await user.click(screen.getByRole("button", { name: /Update Contract/i }));

    await waitFor(() => {
      expect(listTenants).toHaveBeenCalledTimes(1);
      expect(updateContract).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          tenant_id: 2,
          title: "Cross-tenant contract",
          budget: 1500,
          spent: 450,
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/contracts/1?tenant_id=2");
    });
  });

  it("submits edit form and redirects to detail page", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });
    vi.mocked(updateContract).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 1 },
    } as Awaited<ReturnType<typeof updateContract>>);

    render(<EditContractPage />);

    await user.click(await screen.findByRole("button", { name: /Update Contract/i }));

    await waitFor(() => {
      expect(updateContract).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Test", status: "draft", priority: "medium" })
      );
      expect(mockPush).toHaveBeenCalledWith("/contracts/1");
    });
  });

  it("renders the not-found branch and uses the back action", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });
    vi.mocked(getContractById).mockResolvedValueOnce({
      success: true,
      message: "",
      data: null,
    } as unknown as Awaited<ReturnType<typeof getContractById>>);

    render(<EditContractPage />);

    expect(await screen.findByText(/Contract not found/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Back$/i }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the page read-only for archived tenants", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        tenant_archived: true,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });

    render(<EditContractPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Add Incident/i })).toBeDisabled();
    });
  });

  it("shows validation feedback when creating an invalid related incident", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });

    render(<EditContractPage />);

    await user.click(await screen.findByRole("button", { name: /Add Incident/i }));
    await user.click(screen.getByRole("button", { name: /Create Incident/i }));

    expect(await screen.findByText(/Incident title and description are required/i)).toBeTruthy();
  });

  it("creates, updates and deletes related incidents from the edit page", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [
          { resource: "contracts", action: "edit" },
          { resource: "contracts", action: "delete" },
        ],
      },
    });
    vi.mocked(getContractById).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        title: "Test",
        contract_number: "C-001",
        status: "draft",
        priority: "medium",
        created_at: "2026-03-01T00:00:00Z",
        incidents: [
          {
            id: 91,
            title: "Existing incident",
            description: "Needs review",
            severity: "medium",
            status: "open",
            reported_at: "2026-03-01T10:00:00Z",
          },
        ],
      },
    } as Awaited<ReturnType<typeof getContractById>>);
    vi.mocked(createContractIncident).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 92,
        title: "Created incident",
        description: "Created from test",
        severity: "medium",
        status: "open",
        reported_at: "2026-03-02T10:00:00Z",
      },
    } as Awaited<ReturnType<typeof createContractIncident>>);
    vi.mocked(updateContractIncident).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 91,
        title: "Existing incident updated",
        description: "Needs review",
        severity: "medium",
        status: "resolved",
        reported_at: "2026-03-01T10:00:00Z",
      },
    } as Awaited<ReturnType<typeof updateContractIncident>>);
    vi.mocked(deleteContractIncident).mockResolvedValueOnce({
      success: true,
      message: "",
      data: null,
    } as Awaited<ReturnType<typeof deleteContractIncident>>);

    render(<EditContractPage />);

    await user.click(await screen.findByRole("button", { name: /Add Incident/i }));
    await user.type(screen.getByPlaceholderText(/Incident title/i), "Created incident");
    await user.type(screen.getByPlaceholderText(/Incident description/i), "Created from test");
    await user.click(screen.getByRole("button", { name: /Create Incident/i }));

    await waitFor(() => {
      expect(createContractIncident).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: "Created incident",
          description: "Created from test",
        })
      );
      expect(screen.getByText(/Created incident/i)).toBeTruthy();
    });

    await user.click(screen.getAllByRole("button", { name: /^Edit$/i })[1]);
    const titleInput = screen.getByDisplayValue("Existing incident");
    await user.clear(titleInput);
    await user.type(titleInput, "Existing incident updated");
    await user.click(screen.getByRole("button", { name: /Update Incident/i }));

    await waitFor(() => {
      expect(updateContractIncident).toHaveBeenCalledWith(
        1,
        91,
        expect.objectContaining({ title: "Existing incident updated" })
      );
      expect(screen.getByText(/Existing incident updated/i)).toBeTruthy();
    });

    await user.click(screen.getAllByRole("button", { name: /^Delete$/i })[1]);

    await waitFor(() => {
      expect(deleteContractIncident).toHaveBeenCalledWith(1, 91);
      expect(screen.queryByText(/Existing incident updated/i)).toBeNull();
    });
  });

  it("shows API error when contract update fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "contracts", action: "edit" }],
      },
    });
    vi.mocked(updateContract).mockRejectedValueOnce(new Error("Update failed"));

    render(<EditContractPage />);

    await user.click(await screen.findByRole("button", { name: /Update Contract/i }));

    await waitFor(() => {
      expect(screen.getByText(/Update failed/i)).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
