import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationRealtime } from "@/hooks/notifications/useNotificationRealtime";

const mockGetEcho = vi.hoisted(() => vi.fn());
const mockListen = vi.hoisted(() => vi.fn());
const mockPrivate = vi.hoisted(() => vi.fn());
const mockLeave = vi.hoisted(() => vi.fn());

vi.mock("@/lib/realtime", () => ({
  getEcho: mockGetEcho,
}));

describe("useNotificationRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivate.mockReturnValue({ listen: mockListen });
    mockGetEcho.mockReturnValue({ private: mockPrivate, leave: mockLeave });
  });

  it("subscribes to user channel and unsubscribes on unmount", () => {
    const onNotificationAction = vi.fn();

    const { unmount } = renderHook(() =>
      useNotificationRealtime({
        userId: 99,
        enabled: true,
        onNotificationAction,
      })
    );

    expect(mockPrivate).toHaveBeenCalledWith("user.99");
    expect(mockListen).toHaveBeenCalledWith(".notification.sent", expect.any(Function));

    const listener = mockListen.mock.calls[0][1] as (event: unknown) => void;
    listener({ id: 1, title: "N" });
    expect(onNotificationAction).toHaveBeenCalledWith({ id: 1, title: "N" });

    unmount();
    expect(mockLeave).toHaveBeenCalledWith("user.99");
  });

  it("does not subscribe when disabled or user is missing", () => {
    renderHook(() =>
      useNotificationRealtime({
        userId: null,
        enabled: false,
        onNotificationAction: vi.fn(),
      })
    );

    expect(mockGetEcho).not.toHaveBeenCalled();
    expect(mockPrivate).not.toHaveBeenCalled();
  });

  it("gracefully exits when realtime client is unavailable", () => {
    mockGetEcho.mockReturnValue(null);

    renderHook(() =>
      useNotificationRealtime({
        userId: 10,
        onNotificationAction: vi.fn(),
      })
    );

    expect(mockGetEcho).toHaveBeenCalledTimes(1);
    expect(mockPrivate).not.toHaveBeenCalled();
  });
});

