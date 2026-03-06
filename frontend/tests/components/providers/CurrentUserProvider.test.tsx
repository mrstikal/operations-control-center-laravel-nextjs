import { act, render, screen, waitFor } from "@testing-library/react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { authEvents } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMe = vi.hoisted(() => vi.fn());
const mockResetEcho = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  getMe: mockGetMe,
}));

vi.mock("@/lib/realtime", () => ({
  resetEcho: mockResetEcho,
}));

import CurrentUserProvider from "@/components/providers/CurrentUserProvider";

function Consumer() {
  const { user, loading } = useCurrentUser();
  return <div>{loading ? "loading" : user?.email ?? "anonymous"}</div>;
}

describe("CurrentUserProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads current user on mount and provides it through context", async () => {
    mockGetMe.mockResolvedValue({
      success: true,
      message: "",
      data: { id: 5, email: "admin@test.local", roles: [], permissions: [] },
    });

    render(
      <CurrentUserProvider>
        <Consumer />
      </CurrentUserProvider>
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("admin@test.local")).toBeInTheDocument();
    });
  });

  it("resets realtime client and refreshes user on auth change event", async () => {
    mockGetMe
      .mockResolvedValueOnce({
        success: true,
        message: "",
        data: { id: 5, email: "admin@test.local", roles: [], permissions: [] },
      })
      .mockResolvedValueOnce({
        success: true,
        message: "",
        data: { id: 5, email: "updated@test.local", roles: [], permissions: [] },
      });

    render(
      <CurrentUserProvider>
        <Consumer />
      </CurrentUserProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("admin@test.local")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event(authEvents.changed));
    });

    await waitFor(() => {
      expect(mockResetEcho).toHaveBeenCalledTimes(1);
      expect(screen.getByText("updated@test.local")).toBeInTheDocument();
    });
  });

  it("does not switch back to global loading after initial auth is resolved", async () => {
    let releaseSecondRequest: (() => void) | null = null;

    mockGetMe
      .mockResolvedValueOnce({
        success: true,
        message: "",
        data: { id: 5, email: "admin@test.local", roles: [], permissions: [] },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseSecondRequest = () => {
              resolve({
                success: true,
                message: "",
                data: { id: 5, email: "updated@test.local", roles: [], permissions: [] },
              });
            };
          })
      );

    render(
      <CurrentUserProvider>
        <Consumer />
      </CurrentUserProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("admin@test.local")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event(authEvents.changed));
    });

    expect(screen.queryByText("loading")).not.toBeInTheDocument();

    act(() => {
      releaseSecondRequest?.();
    });

    await waitFor(() => {
      expect(screen.getByText("updated@test.local")).toBeInTheDocument();
    });
  });
});

