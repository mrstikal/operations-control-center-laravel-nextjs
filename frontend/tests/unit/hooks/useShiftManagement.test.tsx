import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShiftManagement } from "@/hooks/shifts/useShiftManagement";

const mockPush = vi.hoisted(() => vi.fn());
const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockErrorAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/shifts", () => ({
  listShifts: vi.fn(),
  createShift: vi.fn(),
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    successAction: mockSuccessAction,
    errorAction: mockErrorAction,
    infoAction: vi.fn(),
  }),
}));

import { getMe } from "@/lib/api";
import { createShift, deleteShift, listShifts, updateShift } from "@/lib/api/shifts";

describe("useShiftManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getMe).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Manager",
        email: "manager@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME" },
        roles: [{ id: 1, name: "Manager", level: 3, description: "" }],
      },
    });

    vi.mocked(listShifts).mockResolvedValue({
      success: true,
      message: "",
      data: [
        {
          id: 1,
          name: "Morning",
          start_time: "08:00",
          end_time: "16:00",
          days_of_week: [1, 2, 3, 4, 5],
          is_active: true,
        },
      ],
    });

    vi.mocked(createShift).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 2,
        name: "Evening",
        start_time: "16:00",
        end_time: "00:00",
        days_of_week: [1, 2, 3, 4, 5],
        is_active: true,
      },
    });

    vi.mocked(updateShift).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Morning",
        start_time: "09:00",
        end_time: "17:00",
        days_of_week: [1, 2, 3, 4, 5],
        is_active: true,
      },
    });

    vi.mocked(deleteShift).mockResolvedValue({ success: true, message: "", data: null });
  });

  it("loads shifts and permissions", async () => {
    const { result } = renderHook(() => useShiftManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canManageShifts).toBe(true);
    expect(result.current.sortedShifts).toHaveLength(1);
  });

  it("creates shift through modal flow", async () => {
    const { result } = renderHook(() => useShiftManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openCreateModalAction();
      result.current.updateFormFieldAction({
        name: "Evening",
        start_time: "16:00",
        end_time: "00:00",
        days_of_week: [1, 2, 3],
      });
    });

    await act(async () => {
      await result.current.submitShiftAction();
    });

    expect(createShift).toHaveBeenCalled();
    expect(mockSuccessAction).toHaveBeenCalledWith("Shift created successfully");
  });

  it("requests and confirms delete", async () => {
    const { result } = renderHook(() => useShiftManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.requestDeleteAction(1);
    });

    expect(result.current.pendingDeleteId).toBe(1);

    await act(async () => {
      await result.current.confirmDeleteAction();
    });

    expect(deleteShift).toHaveBeenCalledWith(1);
    expect(mockSuccessAction).toHaveBeenCalledWith("Shift deleted successfully");
  });
});

