import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  get: mockGet,
  post: mockPost,
}));

import {
  getNotificationById,
  getUnreadNotificationsCount,
  getUnreadNotificationsCountByQuery,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

describe("notifications API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list and detail requests with query params", async () => {
    const listResponse = { success: true, message: "", data: [] };
    const detailResponse = {
      success: true,
      message: "",
      data: { id: 5, title: "Alert", read: false },
    };

    mockGet.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(detailResponse);

    const query = {
      read: "0" as const,
      type: "incident",
      priority: "high" as const,
      user_id: 7,
      all_tenants: true,
      page: 2,
      per_page: 25,
    };

    await expect(listNotifications(query)).resolves.toBe(listResponse);
    await expect(getNotificationById(5)).resolves.toBe(detailResponse);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/notifications", query);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/notifications/5");
  });

  it("forwards mark as read and mark all as read endpoints", async () => {
    const markOneResponse = {
      success: true,
      message: "",
      data: { id: 10, read: true },
    };
    const markAllResponse = {
      success: true,
      message: "",
      data: { updated_count: 4 },
    };

    mockPost.mockResolvedValueOnce(markOneResponse).mockResolvedValueOnce(markAllResponse);

    await expect(markNotificationRead(10)).resolves.toBe(markOneResponse);
    await expect(markAllNotificationsRead()).resolves.toBe(markAllResponse);

    expect(mockPost).toHaveBeenNthCalledWith(1, "/notifications/10/mark-read");
    expect(mockPost).toHaveBeenNthCalledWith(2, "/notifications/mark-all-read");
  });

  it("forwards unread count requests with and without query", async () => {
    const countResponse = {
      success: true,
      message: "",
      data: { count: 3 },
    };

    mockGet.mockResolvedValue(countResponse);

    await expect(getUnreadNotificationsCount()).resolves.toBe(countResponse);
    await expect(
      getUnreadNotificationsCountByQuery({ user_id: 11, all_tenants: false })
    ).resolves.toBe(countResponse);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/notifications/unread-count");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/notifications/unread-count", {
      user_id: 11,
      all_tenants: false,
    });
  });

  it("propagates API errors", async () => {
    const error = new Error("notifications failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(listNotifications({ page: 1 })).rejects.toBe(error);
  });
});

