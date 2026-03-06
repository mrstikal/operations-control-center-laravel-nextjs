import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardRealtime } from "@/hooks/dashboard/useDashboardRealtime";

const mockGetEcho = vi.hoisted(() => vi.fn());
const mockPrivate = vi.hoisted(() => vi.fn());
const mockLeave = vi.hoisted(() => vi.fn());

const contractListen = vi.hoisted(() => vi.fn());
const incidentListen = vi.hoisted(() => vi.fn());
const dashboardListen = vi.hoisted(() => vi.fn());

vi.mock("@/lib/realtime", () => ({
  getEcho: mockGetEcho,
}));

describe("useDashboardRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrivate.mockImplementation((channel: string) => {
      if (channel.endsWith("contracts")) return { listen: contractListen };
      if (channel.endsWith("incidents")) return { listen: incidentListen };
      return { listen: dashboardListen };
    });

    mockGetEcho.mockReturnValue({ private: mockPrivate, leave: mockLeave });
  });

  it("subscribes to tenant channels, reacts to events and cleans up on unmount", () => {
    vi.useFakeTimers();

    const onReloadAllAction = vi.fn().mockResolvedValue(undefined);
    const onReloadReadModelsAction = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useDashboardRealtime({
        tenantId: 7,
        onReloadAllAction,
        onReloadReadModelsAction,
      })
    );

    expect(mockPrivate).toHaveBeenCalledWith("tenant.7.contracts");
    expect(mockPrivate).toHaveBeenCalledWith("tenant.7.incidents");
    expect(mockPrivate).toHaveBeenCalledWith("tenant.7.dashboard");

    expect(contractListen).toHaveBeenCalledWith(".contract.updated", expect.any(Function));
    expect(incidentListen).toHaveBeenCalledWith(".incident.closed", expect.any(Function));
    expect(dashboardListen).toHaveBeenCalledWith(".dashboard.read_models_updated", expect.any(Function));

    const contractUpdated = contractListen.mock.calls[0][1] as () => void;
    const readModelsUpdated = dashboardListen.mock.calls[1][1] as () => void;

    act(() => {
      contractUpdated();
      readModelsUpdated();
    });

    expect(onReloadAllAction).toHaveBeenCalledTimes(0);
    expect(onReloadReadModelsAction).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onReloadAllAction).toHaveBeenCalledTimes(0);
    expect(onReloadReadModelsAction).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onReloadAllAction).toHaveBeenCalledTimes(1);
    expect(onReloadReadModelsAction).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockLeave).toHaveBeenCalledWith("tenant.7.contracts");
    expect(mockLeave).toHaveBeenCalledWith("tenant.7.incidents");
    expect(mockLeave).toHaveBeenCalledWith("tenant.7.dashboard");

    vi.useRealTimers();
  });

  it("does not subscribe when tenant id is missing", () => {
    renderHook(() =>
      useDashboardRealtime({
        tenantId: null,
        onReloadAllAction: vi.fn(),
        onReloadReadModelsAction: vi.fn(),
      })
    );

    expect(mockGetEcho).not.toHaveBeenCalled();
  });

  it("gracefully exits when realtime client is unavailable", () => {
    mockGetEcho.mockReturnValue(null);

    renderHook(() =>
      useDashboardRealtime({
        tenantId: 15,
        onReloadAllAction: vi.fn(),
        onReloadReadModelsAction: vi.fn(),
      })
    );

    expect(mockGetEcho).toHaveBeenCalledTimes(1);
    expect(mockPrivate).not.toHaveBeenCalled();
    expect(mockLeave).not.toHaveBeenCalled();
  });
});

