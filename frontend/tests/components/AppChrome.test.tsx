import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/common/ArchivedTenantBanner", () => ({
  default: ({ tenantName }: { tenantName: string }) => <div>Archived tenant: {tenantName}</div>,
}));

import AppChrome from "@/components/AppChrome";

describe("AppChrome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseCurrentUser.mockReturnValue({ user: { id: 1, tenant_id: 1, tenant: { name: "ACME" } }, loading: false });
  });

  it("redirects to login when protected route has no authenticated user", async () => {
    mockUseCurrentUser.mockReturnValue({ user: null, loading: false });

    const { container } = render(
      <AppChrome>
        <div>Secret content</div>
      </AppChrome>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows neutral loading state while auth is resolving on protected route", () => {
    mockUseCurrentUser.mockReturnValue({ user: null, loading: true });

    render(
      <AppChrome>
        <div>Secret content</div>
      </AppChrome>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it("hides header on login route", () => {
    mockUsePathname.mockReturnValue("/login");

    render(
      <AppChrome>
        <div>Login content</div>
      </AppChrome>
    );

    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
    expect(screen.getByText("Login content")).toBeInTheDocument();
  });

  it("shows archived tenant banner for tenant-bound routes", () => {
    mockUsePathname.mockReturnValue("/employees");
    mockUseCurrentUser.mockReturnValue({
      user: {
        id: 1,
        tenant_id: 5,
        tenant_archived: true,
        tenant: { id: 5, name: "Legacy" },
      },
      loading: false,
    });

    render(
      <AppChrome>
        <div>Employees</div>
      </AppChrome>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByText(/Archived tenant: Legacy/i)).toBeInTheDocument();
  });
});

