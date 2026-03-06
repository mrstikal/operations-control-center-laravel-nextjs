import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockIsReadOnly = vi.hoisted(() => vi.fn(() => false));

const mockListNotifications = vi.hoisted(() => vi.fn());
const mockGetUnreadCount = vi.hoisted(() => vi.fn());
const mockMarkRead = vi.hoisted(() => vi.fn());
const mockMarkAllRead = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());
const mockNotifyChanged = vi.hoisted(() => vi.fn());

// Stable toast refs — prevent infinite re-renders caused by useCallback deps on errorAction
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

vi.mock("@/lib/api/notifications", () => ({
  listNotifications: mockListNotifications,
  getUnreadNotificationsCountByQuery: mockGetUnreadCount,
  markNotificationRead: mockMarkRead,
  markAllNotificationsRead: mockMarkAllRead,
}));

vi.mock("@/lib/api/users", () => ({
  listUsers: mockListUsers,
}));

vi.mock("@/hooks/notifications/useNotificationRealtime", () => ({
  useNotificationRealtime: vi.fn(),
}));

vi.mock("@/lib/notificationsEvents", () => ({
  notifyNotificationsChanged: mockNotifyChanged,
}));

import { useNotificationManagement } from "@/hooks/notifications/useNotificationManagement";
import type { Notification } from "@/lib/types";

const baseUser = {
  id: 5,
  tenant_id: 10,
  name: "Charlie",
  email: "charlie@occ.local",
  can_filter_by_tenant: false,
};

const sample: Notification = {
  id: 20,
  tenant_id: 10,
  user_id: 5,
  type: "incident.assigned",
  title: "Incident 42 assigned",
  message: "You have been assigned to Incident 42",
  priority: "high",
  read: false,
  created_at: "2026-03-14T10:00:00Z",
};

describe("useNotificationManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ user: baseUser, loading: false });
    mockIsReadOnly.mockReturnValue(false);

    mockListNotifications.mockResolvedValue({
      success: true,
      message: "",
      data: [sample],
      pagination: { total: 1, per_page: 20, current_page: 1, last_page: 1 },
    });

    mockGetUnreadCount.mockResolvedValue({
      success: true,
      message: "",
      data: { count: 3 },
    });

    mockMarkRead.mockResolvedValue({
      success: true,
      message: "",
      data: { ...sample, read: true, read_at: "2026-03-14T12:00:00Z" },
    });

    mockMarkAllRead.mockResolvedValue({
      success: true,
      message: "",
      data: { updated_count: 5 },
    });

    mockListUsers.mockResolvedValue({ success: true, message: "", data: [] });
  });

  it("loads notification list and unread count on mount", async () => {
    const { result } = renderHook(() => useNotificationManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toEqual([sample]);
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.pagination.total).toBe(1);
  });

  it("resets page on filter change", async () => {
    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setPage(3);
    });

    await act(async () => {
      result.current.handleFilterChangeAction({ read: "0", type: "incident.assigned", priority: "", user_id: "" });
    });

    await waitFor(() => {
      const lastCall = mockListNotifications.mock.calls.at(-1)![0];
      expect(lastCall.page).toBe(1);
      expect(lastCall.read).toBe("0");
    });
  });

  it("marks a single notification as read and updates local state", async () => {
    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markReadAction(sample);
    });

    expect(mockMarkRead).toHaveBeenCalledWith(20);
    expect(result.current.notifications[0].read).toBe(true);
    expect(mockNotifyChanged).toHaveBeenCalled();
  });

  it("skips mark-read when notification is already read", async () => {
    const readNotification: Notification = { ...sample, read: true };
    mockListNotifications.mockResolvedValue({ success: true, message: "", data: [readNotification] });

    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markReadAction(readNotification);
    });

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("marks all notifications as read", async () => {
    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markAllReadAction();
    });

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(mockNotifyChanged).toHaveBeenCalled();
  });

  it("shows error state when fetching notifications fails", async () => {
    mockListNotifications.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toEqual([]);
  });

  it("navigates to detail on viewNotificationAction", async () => {
    const { result } = renderHook(() => useNotificationManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.viewNotificationAction(sample);
    });

    expect(mockPush).toHaveBeenCalledWith("/notifications/20");
  });
});

