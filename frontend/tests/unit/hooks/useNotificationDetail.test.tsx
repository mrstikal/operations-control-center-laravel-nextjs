import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockIsReadOnly = vi.hoisted(() => vi.fn(() => false));
const mockGetNotificationById = vi.hoisted(() => vi.fn());
const mockMarkRead = vi.hoisted(() => vi.fn());
const mockNotifyChanged = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/api/notifications", () => ({
  getNotificationById: mockGetNotificationById,
  markNotificationRead: mockMarkRead,
}));

vi.mock("@/lib/notificationsEvents", () => ({
  notifyNotificationsChanged: mockNotifyChanged,
}));

import { useNotificationDetail } from "@/hooks/notifications/useNotificationDetail";
import type { Notification } from "@/lib/types";

const baseUser = { id: 1, tenant_id: 1, name: "Alice", email: "alice@occ.local" };

const sample: Notification = {
  id: 77,
  tenant_id: 1,
  user_id: 1,
  type: "contract.expiring",
  title: "Contract expiring soon",
  message: "Contract #99 expires in 7 days",
  priority: "medium",
  read: false,
  action_url: "/contracts/99",
  created_at: "2026-03-14T08:00:00Z",
};

describe("useNotificationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ user: baseUser, loading: false });
    mockIsReadOnly.mockReturnValue(false);

    mockGetNotificationById.mockResolvedValue({
      success: true,
      message: "",
      data: sample,
    });

    mockMarkRead.mockResolvedValue({
      success: true,
      message: "",
      data: { ...sample, read: true, read_at: "2026-03-14T09:00:00Z" },
    });
  });

  it("loads notification detail on mount", async () => {
    const { result } = renderHook(() => useNotificationDetail("77"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notification).toEqual(sample);
    expect(result.current.error).toBeNull();
    expect(result.current.actionUrl).toBe("/contracts/99");
  });

  it("surfaces load error state", async () => {
    mockGetNotificationById.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notification).toBeNull();
    expect(result.current.error).toBe("Not found");
  });

  it("marks notification as read and notifies global listeners", async () => {
    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markReadAction();
    });

    expect(mockMarkRead).toHaveBeenCalledWith(77);
    expect(result.current.notification?.read).toBe(true);
    expect(mockNotifyChanged).toHaveBeenCalled();
  });

  it("skips mark-read when notification is already read", async () => {
    mockGetNotificationById.mockResolvedValue({
      success: true,
      message: "",
      data: { ...sample, read: true },
    });

    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markReadAction();
    });

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("skips mark-read when tenant is read-only", async () => {
    mockIsReadOnly.mockReturnValue(true);

    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markReadAction();
    });

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("navigates back to notification list on goBack", async () => {
    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.goBackAction();
    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });

  it("navigates to action url", async () => {
    const { result } = renderHook(() => useNotificationDetail("77"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.openActionUrlAction();
    expect(mockPush).toHaveBeenCalledWith("/contracts/99");
  });
});

