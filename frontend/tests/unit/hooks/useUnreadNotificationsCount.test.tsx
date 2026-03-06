import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUnreadNotificationsCount } from "@/hooks/notifications/useUnreadNotificationsCount";
import { notificationsEvents } from "@/lib/notificationsEvents";

vi.mock("@/lib/api/notifications", () => ({
  getUnreadNotificationsCountByQuery: vi.fn(),
}));

vi.mock("@/hooks/notifications/useNotificationRealtime", () => ({
  useNotificationRealtime: vi.fn(),
}));

import { getUnreadNotificationsCountByQuery } from "@/lib/api/notifications";

describe("useUnreadNotificationsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes unread count when notifications change event is dispatched", async () => {
    vi.mocked(getUnreadNotificationsCountByQuery)
      .mockResolvedValueOnce({ success: true, message: "", data: { count: 5 } })
      .mockResolvedValueOnce({ success: true, message: "", data: { count: 4 } });

    const { result } = renderHook(() =>
      useUnreadNotificationsCount({
        userId: 10,
        enabled: true,
        includeAllTenants: false,
      })
    );

    await waitFor(() => expect(result.current.unreadCount).toBe(5));

    act(() => {
      window.dispatchEvent(new Event(notificationsEvents.changed));
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(4));
    expect(getUnreadNotificationsCountByQuery).toHaveBeenCalledTimes(2);
  });
});

