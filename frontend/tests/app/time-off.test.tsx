// Covers: app/time-off/page.tsx, app/time-off/[id]/page.tsx,
//         app/time-off/create/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseTimeOffManagement = vi.hoisted(() => vi.fn());
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
const emptyList = vi.hoisted(() => ({
  success: true,
  message: "",
  data: [],
  pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn().mockResolvedValue({ success: true, message: "", data: mockMe }),
}));

vi.mock("@/lib/api/timeOff", () => ({
  listTimeOffRequests: vi.fn().mockResolvedValue(emptyList),
  getTimeOffRequestById: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      id: 1,
      status: "pending",
      type: "vacation",
      start_date: "2026-03-10",
      end_date: "2026-03-11",
      requested_at: "2026-03-01",
    },
  }),
  decideTimeOffRequest: vi.fn().mockResolvedValue({ success: true, message: "", data: {} }),
  archiveTimeOffRequest: vi.fn().mockResolvedValue({ success: true, message: "", data: {} }),
  createTimeOffRequest: vi.fn().mockResolvedValue({ success: true, message: "", data: {} }),
}));

vi.mock("@/lib/api/employees", () => ({
  listEmployees: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/lib/api/metadata", () => ({
  getHRMetadata: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      departments: [],
      availability_statuses: [],
      time_off_types: [],
      time_off_statuses: [],
    },
  }),
}));

vi.mock("@/hooks/timeOff/useTimeOffManagement", () => ({
  useTimeOffManagement: mockUseTimeOffManagement,
}));

import TimeOffPage from "@/app/time-off/page";
import TimeOffDetailPage from "@/app/time-off/[id]/page";
import CreateTimeOffPage from "@/app/time-off/create/page";
import { getMe } from "@/lib/api";
import {
  archiveTimeOffRequest,
  createTimeOffRequest,
  decideTimeOffRequest,
} from "@/lib/api/timeOff";

function createTimeOffManagementState(overrides: Record<string, unknown> = {}) {
  return {
    requests: [],
    loading: false,
    metadata: {
      departments: [],
      availability_statuses: [],
      time_off_types: [],
      time_off_statuses: [],
    },
    sort: "requested_at:desc",
    page: 1,
    perPage: 15,
    pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    decisionModal: { open: false, request: null, action: null },
    approvalNote: "",
    submitting: false,
    isReadOnly: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    setApprovalNote: vi.fn(),
    handleFilterChangeAction: vi.fn(),
    handleSortChangeAction: vi.fn(),
    openDecisionModalAction: vi.fn(),
    closeDecisionModalAction: vi.fn(),
    submitDecisionAction: vi.fn(),
    canDecideRequest: vi.fn().mockReturnValue(false),
    viewRequestAction: vi.fn(),
    goToCreateRequestAction: vi.fn(),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("TimeOffPage (list)", () => {
  beforeEach(() => {
    mockUseTimeOffManagement.mockReturnValue(createTimeOffManagementState());
  });

  it("renders the Time-Off Requests heading", () => {
    render(<TimeOffPage />);
    expect(screen.getByRole("heading", { name: /Time-Off Requests/i })).toBeTruthy();
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("TimeOffDetailPage", () => {
  it("renders without crashing", async () => {
    render(<TimeOffDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Time-Off Request #1/i })).toBeTruthy();
      expect(screen.getByRole("heading", { name: /Request Details/i })).toBeTruthy();
    });
  });

  it("approves pending request for manager and calls decision API", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 1, name: "Manager", level: 3, description: "Manager role" }],
      },
    });

    render(<TimeOffDetailPage />);
    await user.click(await screen.findByRole("button", { name: /Approve/i }));
    await user.click(await screen.findByRole("button", { name: /Confirm APPROVE/i }));

    await waitFor(() => {
      expect(decideTimeOffRequest).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "approved" })
      );
    });
  });

  it("archives request for superadmin", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 2, name: "Superadmin", level: 4, description: "Superadmin role" }],
      },
    });

    render(<TimeOffDetailPage />);
    await user.click(await screen.findByRole("button", { name: /Archive/i }));

    await waitFor(() => {
      expect(archiveTimeOffRequest).toHaveBeenCalledWith(1);
    });
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("CreateTimeOffPage", () => {
  it("renders form with core controls", async () => {
    render(<CreateTimeOffPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /New Time-Off Request/i })).toBeTruthy();
      expect(screen.getByText(/Start Date/i)).toBeTruthy();
      expect(screen.getByText(/End Date/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Submit Request/i })).toBeTruthy();
    });
  });

  it("submits create request and redirects to list", async () => {
    const user = userEvent.setup();
    render(<CreateTimeOffPage />);

    await screen.findByRole("heading", { name: /New Time-Off Request/i });
    const dateInputs = document.querySelectorAll("input[type='date']");
    fireEvent.change(dateInputs[0], { target: { value: "2026-04-10" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-04-11" } });
    await user.click(screen.getByRole("button", { name: /Submit Request/i }));

    await waitFor(() => {
      expect(createTimeOffRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: "2026-04-10",
          end_date: "2026-04-11",
          type: "vacation",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/time-off");
    });
  });
});
