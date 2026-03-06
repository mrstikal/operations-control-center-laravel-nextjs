// Covers: app/incidents/page.tsx, app/incidents/[id]/page.tsx,
//         app/incidents/create/page.tsx, app/incidents/[id]/edit/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseIncidentManagement = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/api/incidents", () => ({
  listIncidents: vi.fn().mockResolvedValue(emptyList),
  getIncidentById: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: { id: 1, title: "Fire", status: "open" },
  }),
  updateIncident: vi.fn(),
  closeIncident: vi.fn(),
  escalateIncident: vi.fn(),
  getIncidentTimeline: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  getIncidentAssignments: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  getIncidentEscalations: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  getIncidentComments: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  addIncidentComment: vi.fn(),
  deleteIncident: vi.fn(),
  restoreIncident: vi.fn(),
  hardDeleteIncident: vi.fn(),
  createIncident: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/lib/api/users", () => ({
  listUsers: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/hooks/incidents/useIncidentDetail", () => ({
  useIncidentDetail: vi.fn(),
}));

vi.mock("@/hooks/incidents/useIncidentManagement", () => ({
  useIncidentManagement: mockUseIncidentManagement,
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncidentsPage from "@/app/incidents/page";
import IncidentDetailPage from "@/app/incidents/[id]/page";
import CreateIncidentPage from "@/app/incidents/create/page";
import IncidentEditPage from "@/app/incidents/[id]/edit/page";
import { useIncidentDetail } from "@/hooks/incidents/useIncidentDetail";
import { getMe } from "@/lib/api";
import { updateIncident } from "@/lib/api/incidents";

const mockedUseIncidentDetail = vi.mocked(useIncidentDetail);

function createIncidentManagementState(overrides: Record<string, unknown> = {}) {
  return {
    incidents: [],
    loading: false,
    error: null,
    tenants: [],
    canFilterByTenant: false,
    canCreateIncidents: true,
    canEditIncidents: true,
    sort: "",
    page: 1,
    perPage: 15,
    pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    filterInitialValues: {},
    isPageReadOnly: false,
    archivedTenantNameForBanner: null,
    editModalOpen: false,
    editModalLoading: false,
    editingIncident: null,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChangeAction: vi.fn(),
    handleSortChangeAction: vi.fn(),
    createIncidentAction: vi.fn(),
    viewIncidentDetailAction: vi.fn(),
    openEditIncidentAction: vi.fn(),
    closeEditModalAction: vi.fn(),
    submitEditIncidentAction: vi.fn(),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("IncidentsPage (list)", () => {
  beforeEach(() => {
    mockUseIncidentManagement.mockReturnValue(createIncidentManagementState());
  });

  it("renders the Incidents heading", async () => {
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Incidents/i })).toBeTruthy();
    });
  });

  it("shows archived tenant name in muted style instead of dash", () => {
    mockUseIncidentManagement.mockReturnValue(
      createIncidentManagementState({
        canFilterByTenant: true,
        incidents: [
          {
            id: 1,
            title: "Network outage",
            status: "open",
            tenant: {
              id: 10,
              name: "Archived Tenant",
              deleted_at: "2026-03-15T10:00:00Z",
            },
          },
        ],
      })
    );

    render(<IncidentsPage />);

    const tenantCell = screen.getByText("Archived Tenant");
    expect(tenantCell).toHaveClass("text-dimmed");
    expect(screen.queryByText("—")).toBeNull();
  });

  it("disables Edit only for row with archived tenant", () => {
    mockUseIncidentManagement.mockReturnValue(
      createIncidentManagementState({
        canFilterByTenant: true,
        isPageReadOnly: false,
        incidents: [
          {
            id: 1,
            title: "Archived tenant incident",
            status: "open",
            tenant: {
              id: 10,
              name: "Archived Tenant",
              deleted_at: "2026-03-15T10:00:00Z",
            },
          },
          {
            id: 2,
            title: "Active tenant incident",
            status: "open",
            tenant: {
              id: 11,
              name: "Active Tenant",
              deleted_at: null,
            },
          },
        ],
      })
    );

    render(<IncidentsPage />);

    const archivedRow = screen.getByText("Archived tenant incident").closest("tr");
    const activeRow = screen.getByText("Active tenant incident").closest("tr");

    expect(archivedRow).toBeTruthy();
    expect(activeRow).toBeTruthy();

    expect(within(archivedRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(activeRow as HTMLElement).getByRole("button", { name: "Edit" })).toBeEnabled();
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("IncidentDetailPage", () => {
  beforeEach(() => {
    const detailState: ReturnType<typeof useIncidentDetail> = {
      incident: {
        id: 1,
        title: "Fire",
        incident_number: "INC-001",
        status: "open",
        severity: "high",
      },
      loading: false,
      loadError: null,
      errorMessage: null,
      actionLoading: false,
      commentLoading: false,
      isReadOnly: false,
      permissions: [],
      timeline: [],
      assignments: [],
      escalations: [],
      comments: [],
      users: [],
      newComment: "",
      isInternalComment: false,
      showEscalationModal: false,
      escalationForm: {
        escalated_to: "",
        escalation_level: "level_1",
        reason: "",
        notes: "",
      },
      canEditIncidents: true,
      canDeleteIncidents: true,
      canCloseIncidents: true,
      canEscalateIncidents: true,
      clearErrorAction: vi.fn(),
      goBackAction: vi.fn(),
      setNewComment: vi.fn(),
      setIsInternalComment: vi.fn(),
      openEscalationModalAction: vi.fn(),
      closeEscalationModalAction: vi.fn(),
      updateEscalationFormAction: vi.fn(),
      handleCloseAction: vi.fn(async () => {}),
      handleEscalateAction: vi.fn(async () => {}),
      handleAddCommentAction: vi.fn(async () => {}),
      handleSoftDeleteAction: vi.fn(async () => {}),
      handleHardDeleteAction: vi.fn(async () => {}),
      handleRestoreAction: vi.fn(async () => {}),
    };

    mockedUseIncidentDetail.mockReturnValue(detailState);
  });

  it("renders heading and sections from orchestration page", () => {
    render(<IncidentDetailPage />);
    expect(screen.getByRole("heading", { name: /Fire/i })).toBeTruthy();
    expect(screen.getByText(/Incident #INC-001/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Assignments/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Timeline/i })).toBeTruthy();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("CreateIncidentPage", () => {
  it("renders without crashing", async () => {
    render(<CreateIncidentPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/You don't have permission to create incidents/i)
      ).toBeTruthy();
    });
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────
describe("IncidentEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    render(<IncidentEditPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/You do not have permission to edit incidents\./i)
      ).toBeTruthy();
    });
  });

  it("renders edit form when user has edit permission", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "incidents", action: "edit" }],
      },
    });

    render(<IncidentEditPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Incident/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeTruthy();
    });
  });

  it("submits edit form and redirects to detail page", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "incidents", action: "edit" }],
      },
    });
    vi.mocked(updateIncident).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 1 },
    } as Awaited<ReturnType<typeof updateIncident>>);

    render(<IncidentEditPage />);

    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateIncident).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Fire", status: "open", severity: "" })
      );
      expect(mockPush).toHaveBeenCalledWith("/incidents/1");
    });
  });

  it("shows API error when incident update fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        permissions: [{ resource: "incidents", action: "edit" }],
      },
    });
    vi.mocked(updateIncident).mockRejectedValueOnce(new Error("Incident update failed"));

    render(<IncidentEditPage />);

    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Incident update failed/i)).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
