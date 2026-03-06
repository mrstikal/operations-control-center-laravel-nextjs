import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockIsReadOnly = vi.hoisted(() => vi.fn(() => false));
const mockListSchedules = vi.hoisted(() => vi.fn());
const mockDeleteSchedule = vi.hoisted(() => vi.fn());

// Stable toast refs — prevent infinite re-renders (errorAction in useCallback deps)
const mockErrorAction = vi.hoisted(() => vi.fn());
const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockInfoAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/lib/hooks/useTenantReadOnly", () => ({
  useTenantReadOnly: () => ({
    isReadOnly: mockIsReadOnly(),
  }),
}));

// Override global setup.ts mock with stable references
vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    errorAction: mockErrorAction,
    successAction: mockSuccessAction,
    infoAction: mockInfoAction,
  }),
}));

vi.mock("@/lib/api/notificationSchedules", () => ({
  listNotificationSchedules: mockListSchedules,
  deleteNotificationSchedule: mockDeleteSchedule,
}));

import { useNotificationScheduleManagement } from "@/hooks/notifications/useNotificationScheduleManagement";
import type { NotificationSchedule } from "@/lib/types";

const baseUser = { id: 3, tenant_id: 1, name: "Dave", email: "dave@occ.local" };

const sampleSchedule: NotificationSchedule = {
  id: 55,
  tenant_id: 1,
  name: "Incident Assigned Alert",
  notification_type: "incident.assigned",
  trigger: "incident_assigned",
  is_active: true,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

describe("useNotificationScheduleManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ user: baseUser, loading: false });
    mockIsReadOnly.mockReturnValue(false);

    mockListSchedules.mockResolvedValue({
      success: true,
      message: "",
      data: [sampleSchedule],
      pagination: { total: 1, per_page: 20, current_page: 1, last_page: 1 },
    });

    mockDeleteSchedule.mockResolvedValue({
      success: true,
      message: "",
      data: { deleted: true },
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads schedules list on mount", async () => {
    const { result } = renderHook(() => useNotificationScheduleManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.schedules).toEqual([sampleSchedule]);
    expect(result.current.pagination.total).toBe(1);
  });

  it("resets to page 1 when filter changes", async () => {
    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setPage(3);
    });

    await act(async () => {
      result.current.handleFilterChangeAction({ trigger: "sla_breach", is_active: "1" });
    });

    await waitFor(() => {
      const lastCall = mockListSchedules.mock.calls.at(-1)![0];
      expect(lastCall.page).toBe(1);
      expect(lastCall.trigger).toBe("sla_breach");
    });
  });

  it("navigates to create page", async () => {
    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.viewCreatePageAction();
    });

    expect(mockPush).toHaveBeenCalledWith("/notification-schedules/create");
  });

  it("navigates to edit page", async () => {
    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.viewEditPageAction(sampleSchedule);
    });

    expect(mockPush).toHaveBeenCalledWith("/notification-schedules/55/edit");
  });

  it("deletes schedule after confirmation and refreshes list", async () => {
    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockListSchedules.mockResolvedValue({
      success: true,
      message: "",
      data: [],
      pagination: { total: 0, per_page: 20, current_page: 1, last_page: 1 },
    });

    await act(async () => {
      await result.current.deleteScheduleAction(sampleSchedule);
    });

    expect(mockDeleteSchedule).toHaveBeenCalledWith(55);
    await waitFor(() => expect(result.current.schedules).toEqual([]));
  });

  it("aborts delete when user cancels confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteScheduleAction(sampleSchedule);
    });

    expect(mockDeleteSchedule).not.toHaveBeenCalled();
  });

  it("shows error state when API fails", async () => {
    mockListSchedules.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useNotificationScheduleManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.schedules).toEqual([]);
  });
});

