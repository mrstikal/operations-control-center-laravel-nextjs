// Covers: app/shifts/page.tsx, app/shifts/[id]/page.tsx
// Also tests the module-internal getDaysLabel helper indirectly through render.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseShiftManagement = vi.hoisted(() => vi.fn());
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
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn().mockResolvedValue({ success: true, message: "", data: mockMe }),
}));

vi.mock("@/lib/api/shifts", () => ({
  listShifts: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  getShift: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      id: 1,
      name: "Morning",
      start_time: "08:00",
      end_time: "16:00",
      days_of_week: [1, 2, 3, 4, 5],
      is_active: true,
      description: "",
    },
  }),
  createShift: vi.fn(),
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
  assignEmployeesToShift: vi.fn(),
  removeEmployeeShiftAssignment: vi.fn(),
}));

vi.mock("@/lib/api/employees", () => ({
  listEmployees: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/hooks/shifts/useShiftManagement", () => ({
  useShiftManagement: mockUseShiftManagement,
}));

import ShiftsPage from "@/app/shifts/page";
import ShiftDetailPage from "@/app/shifts/[id]/page";
import { getMe } from "@/lib/api";
import { deleteShift, getShift, removeEmployeeShiftAssignment } from "@/lib/api/shifts";
import { UI_MESSAGES } from "@/lib/ui-messages";

function createShiftManagementState(overrides: Record<string, unknown> = {}) {
  return {
    loading: true,
    sortedShifts: [],
    modalOpen: false,
    editingShift: null,
    submitting: false,
    canManageShifts: true,
    isReadOnly: false,
    formData: {
      name: "",
      start_time: "",
      end_time: "",
      days_of_week: [],
      description: "",
      is_active: true,
    },
    pendingDeleteId: null,
    openCreateModalAction: vi.fn(),
    openEditModalAction: vi.fn(),
    closeModalAction: vi.fn(),
    updateFormFieldAction: vi.fn(),
    toggleDayAction: vi.fn(),
    submitShiftAction: vi.fn(),
    requestDeleteAction: vi.fn(),
    cancelDeleteAction: vi.fn(),
    confirmDeleteAction: vi.fn(),
    openShiftDetailAction: vi.fn(),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("ShiftsPage (list)", () => {
  beforeEach(() => {
    mockUseShiftManagement.mockReturnValue(createShiftManagementState());
  });

  it("shows the loading indicator initially", () => {
    render(<ShiftsPage />);
    expect(screen.getByText(/Loading shifts/i)).toBeTruthy();
  });

  it("renders the empty state and opens the create flow", async () => {
    const user = userEvent.setup();
    const state = createShiftManagementState({ loading: false });
    mockUseShiftManagement.mockReturnValue(state);

    render(<ShiftsPage />);

    expect(screen.getByText(/No shifts found/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Create your first shift/i }));

    expect(state.openCreateModalAction).toHaveBeenCalledTimes(1);
  });

  it("disables management CTAs in read-only mode", () => {
    mockUseShiftManagement.mockReturnValue(
      createShiftManagementState({ loading: false, isReadOnly: true })
    );

    render(<ShiftsPage />);

    expect(screen.getByRole("button", { name: /New Shift/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Create your first shift/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /New Shift/i })).toHaveAttribute(
      "title",
      UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY
    );
  });

  it("renders shift cards, branch-specific day labels and management actions", async () => {
    const user = userEvent.setup();
    const shifts = [
      {
        id: 1,
        name: "Weekday Shift",
        start_time: "08:00",
        end_time: "16:00",
        days_of_week: [1, 2, 3, 4, 5],
        description: "Main floor coverage",
        is_active: true,
      },
      {
        id: 2,
        name: "Weekend Shift",
        start_time: "09:00",
        end_time: "17:00",
        days_of_week: [6, 7],
        description: "",
        is_active: false,
      },
      {
        id: 3,
        name: "Always On",
        start_time: "00:00",
        end_time: "23:59",
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        description: "24/7 rotation",
        is_active: true,
      },
    ];
    const state = createShiftManagementState({ loading: false, sortedShifts: shifts });
    mockUseShiftManagement.mockReturnValue(state);

    render(<ShiftsPage />);

    expect(screen.getByText(/Weekdays/i)).toBeTruthy();
    expect(screen.getByText(/Weekends/i)).toBeTruthy();
    expect(screen.getByText(/Every day/i)).toBeTruthy();
    expect(screen.getByText(/Inactive/i)).toBeTruthy();
    expect(screen.getByText(/Main floor coverage/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Weekend Shift/i }));
    await user.click(screen.getAllByRole("button", { name: "✎" })[0]);
    await user.click(screen.getAllByRole("button", { name: "×" })[0]);

    expect(state.openShiftDetailAction).toHaveBeenCalledWith(shifts[1]);
    expect(state.openEditModalAction).toHaveBeenCalledWith(shifts[0]);
    expect(state.requestDeleteAction).toHaveBeenCalledWith(1);
  });

  it("renders modal branches and blocks invalid submit", () => {
    mockUseShiftManagement.mockReturnValue(
      createShiftManagementState({
        loading: false,
        modalOpen: true,
        formData: {
          name: "",
          start_time: "",
          end_time: "",
          days_of_week: [],
          description: "",
          is_active: true,
        },
      })
    );

    render(<ShiftsPage />);

    const dialog = screen.getByRole("dialog", { name: /New Shift/i });

    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /^Create$/i })).toBeDisabled();
  });

  it("submits a valid edit modal and handles modal cancel", async () => {
    const user = userEvent.setup();
    const editingShift = {
      id: 7,
      name: "Night",
      start_time: "22:00",
      end_time: "06:00",
      days_of_week: [1, 2, 3],
      description: "Night coverage",
      is_active: true,
    };
    const state = createShiftManagementState({
      loading: false,
      modalOpen: true,
      editingShift,
      formData: editingShift,
    });
    mockUseShiftManagement.mockReturnValue(state);

    render(<ShiftsPage />);

    expect(screen.getByRole("dialog", { name: /Edit Shift/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    await user.click(screen.getByRole("button", { name: /Update/i }));

    expect(state.closeModalAction).toHaveBeenCalledTimes(1);
    expect(state.submitShiftAction).toHaveBeenCalledTimes(1);
  });

  it("renders the delete confirmation dialog and wires cancel/confirm actions", async () => {
    const user = userEvent.setup();
    const state = createShiftManagementState({ loading: false, pendingDeleteId: 5 });
    mockUseShiftManagement.mockReturnValue(state);

    render(<ShiftsPage />);

    expect(screen.getByRole("dialog", { name: /Delete shift/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(state.cancelDeleteAction).toHaveBeenCalledTimes(1);
    expect(state.confirmDeleteAction).toHaveBeenCalledTimes(1);
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("ShiftDetailPage", () => {
  it("renders without crashing", async () => {
    render(<ShiftDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Morning/i })).toBeTruthy();
      expect(screen.getByRole("heading", { name: /Overview/i })).toBeTruthy();
      expect(screen.getByText(/Weekdays/i)).toBeTruthy();
    });
  });

  it("deletes shift for manager and redirects to list", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 1, name: "Manager", level: 3, description: "Manager role" }],
      },
    });

    render(<ShiftDetailPage />);
    await user.click(await screen.findByRole("button", { name: /Delete Shift/i }));

    await waitFor(() => {
      expect(deleteShift).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  it("removes assigned employee", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 1, name: "Manager", level: 3, description: "Manager role" }],
      },
    });
    vi.mocked(getShift).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Morning",
        start_time: "08:00",
        end_time: "16:00",
        days_of_week: [1, 2, 3, 4, 5],
        is_active: true,
        description: "",
        employees: [
          {
            id: 77,
            employee_id: 2,
            shift_id: 1,
            start_date: "2026-03-01",
            is_active: true,
            employee: {
              id: 2,
              user: { id: 200, name: "Alice", email: "alice@example.com" },
            },
          },
        ],
      },
    } as Awaited<ReturnType<typeof getShift>>);

    render(<ShiftDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(removeEmployeeShiftAssignment).toHaveBeenCalledWith(77);
    });
  });
});
