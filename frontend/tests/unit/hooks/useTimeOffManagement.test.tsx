import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeOffManagement } from "@/hooks/timeOff/useTimeOffManagement";
import type { TimeOffRequest } from "@/lib/api/timeOff";

const mockPush = vi.hoisted(() => vi.fn());
const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockErrorAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/timeOff", () => ({
  listTimeOffRequests: vi.fn(),
  decideTimeOffRequest: vi.fn(),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      id: 10,
      name: "Manager",
      email: "manager@test.local",
      tenant_id: 1,
      tenant: { id: 1, name: "ACME" },
      roles: [{ id: 1, name: "Manager", level: 3, description: "" }],
    },
    loading: false,
    refreshAction: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useHRMetadata", () => ({
  useHRMetadata: () => ({
    metadata: {
      departments: ["Operations"],
      availability_statuses: [],
      time_off_types: [{ label: "Vacation", value: "vacation" }],
      time_off_statuses: [{ label: "Pending", value: "pending" }],
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    successAction: mockSuccessAction,
    errorAction: mockErrorAction,
    infoAction: vi.fn(),
  }),
}));

import { decideTimeOffRequest, listTimeOffRequests } from "@/lib/api/timeOff";

const sampleRequest: TimeOffRequest = {
  id: 5,
  employee_id: 2,
  start_date: "2026-03-10",
  end_date: "2026-03-12",
  type: "vacation",
  status: "pending",
  requested_at: "2026-03-01",
  employee: {
    user: {
      id: 2,
      name: "Employee",
      email: "employee@test.local",
      roles: [{ level: 2 }],
    },
    department: "Operations",
    position: "Operator",
  },
};

describe("useTimeOffManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listTimeOffRequests).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleRequest],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    vi.mocked(decideTimeOffRequest).mockResolvedValue({
      success: true,
      message: "",
      data: { ...sampleRequest, status: "approved" },
    });
  });

  it("loads requests and evaluates decision permission", async () => {
    const { result } = renderHook(() => useTimeOffManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.requests).toEqual([sampleRequest]);
    expect(result.current.canDecideRequest(sampleRequest)).toBe(true);
    expect(result.current.canDecideRequest({ ...sampleRequest, status: "approved" })).toBe(false);
  });

  it("opens and closes decision modal", async () => {
    const { result } = renderHook(() => useTimeOffManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openDecisionModalAction(sampleRequest, "approve");
    });

    expect(result.current.decisionModal.open).toBe(true);
    expect(result.current.decisionModal.action).toBe("approve");

    await act(async () => {
      result.current.closeDecisionModalAction();
    });

    expect(result.current.decisionModal.open).toBe(false);
  });

  it("submits decision and refreshes list", async () => {
    const { result } = renderHook(() => useTimeOffManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openDecisionModalAction(sampleRequest, "approve");
      result.current.setApprovalNote("Approved for coverage reasons");
    });

    await act(async () => {
      await result.current.submitDecisionAction();
    });

    expect(decideTimeOffRequest).toHaveBeenCalledWith(sampleRequest.id, {
      status: "approved",
      approval_note: "Approved for coverage reasons",
    });
    expect(mockSuccessAction).toHaveBeenCalledWith("Request approved successfully");
    expect(listTimeOffRequests).toHaveBeenCalledTimes(2);
  });
});

