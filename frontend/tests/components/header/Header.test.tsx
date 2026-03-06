import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockCanFilterByTenantContext = vi.hoisted(() => vi.fn());
const mockUseUnreadNotificationsCount = vi.hoisted(() => vi.fn());

const mockLogout = vi.hoisted(() => vi.fn());
const mockSetDefaultTenant = vi.hoisted(() => vi.fn());
const mockListTenants = vi.hoisted(() => vi.fn());

const mockClearToken = vi.hoisted(() => vi.fn());
const mockClearTenantContext = vi.hoisted(() => vi.fn());
const mockSetTenantContext = vi.hoisted(() => vi.fn());
const mockSetTenantContextAll = vi.hoisted(() => vi.fn());
const mockGetTenantContext = vi.hoisted(() => vi.fn(() => null));
const mockIsTenantContextAll = vi.hoisted(() => vi.fn(() => false));

const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockErrorAction = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/lib/tenantAccess", () => ({
  canFilterByTenantContext: mockCanFilterByTenantContext,
}));

vi.mock("@/hooks/notifications/useUnreadNotificationsCount", () => ({
  useUnreadNotificationsCount: (params: unknown) => {
    mockUseUnreadNotificationsCount(params);
    return { unreadCount: 6 };
  },
}));

vi.mock("@/lib/api", () => ({
  logout: mockLogout,
  setDefaultTenant: mockSetDefaultTenant,
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: mockListTenants,
}));

vi.mock("@/lib/auth", () => ({
  clearToken: mockClearToken,
  clearTenantContext: mockClearTenantContext,
  setTenantContext: mockSetTenantContext,
  setTenantContextAll: mockSetTenantContextAll,
  getTenantContext: mockGetTenantContext,
  isTenantContextAll: mockIsTenantContextAll,
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    successAction: mockSuccessAction,
    errorAction: mockErrorAction,
  }),
}));

vi.mock("@/components/header/Logo", () => ({
  default: () => <span>Logo</span>,
}));

vi.mock("@/components/header/MainNav", () => ({
  default: ({ hasSuperadminRole, showNav }: { hasSuperadminRole: boolean; showNav: boolean }) => (
    <div data-testid="main-nav">MainNav superadmin:{String(hasSuperadminRole)} visible:{String(showNav)}</div>
  ),
}));

vi.mock("@/components/header/UserSection", () => ({
  default: ({
    name,
    email,
    onLogoutAction,
    unreadNotificationsCount,
  }: {
    name: string;
    email: string;
    onLogoutAction: () => void;
    unreadNotificationsCount: number;
  }) => (
    <div>
      <div>User: {name}</div>
      <div>Email: {email}</div>
      <div>Unread: {unreadNotificationsCount}</div>
      <button onClick={onLogoutAction}>Log out</button>
    </div>
  ),
}));

vi.mock("@/components/header/TenantSwitcher", () => ({
  default: ({ canSwitchTenant }: { canSwitchTenant: boolean }) => (
    <div>TenantSwitcher: {String(canSwitchTenant)}</div>
  ),
}));

import Header from "@/components/header/Header";

const baseUser = {
  id: 12,
  tenant_id: 33,
  name: "Alice Admin",
  email: "alice@occ.local",
  can_filter_by_tenant: true,
  roles: [{ id: 9, name: "Superadmin", level: 5, description: "" }],
};

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsePathname.mockReturnValue("/dashboard");
    mockUseCurrentUser.mockReturnValue({
      user: baseUser,
      refreshAction: vi.fn().mockResolvedValue(undefined),
    });
    mockCanFilterByTenantContext.mockReturnValue(true);

    mockLogout.mockResolvedValue({ success: true, message: "", data: null });
    mockSetDefaultTenant.mockResolvedValue({ success: true, message: "", data: { default_tenant_id: 33 } });
    mockListTenants.mockResolvedValue({ success: true, message: "", data: [{ id: 33, name: "Tenant A" }] });
  });

  it("renders main sections and forwards role/user context", async () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Go to dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("main-nav")).toHaveTextContent("superadmin:true");
    expect(screen.getByText("User: Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("Unread: 6")).toBeInTheDocument();
    expect(screen.getByText("TenantSwitcher: true")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUseUnreadNotificationsCount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 12, enabled: true, includeAllTenants: true })
      );
    });
  });

  it("requests tenant list with include_archived for superadmin", async () => {
    render(<Header />);

    await waitFor(() => {
      expect(mockListTenants).toHaveBeenCalledWith({ include_archived: true });
    });
  });

  it("executes logout flow and redirects to login", async () => {
    const user = userEvent.setup();

    render(<Header />);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockClearToken).toHaveBeenCalledTimes(1);
      expect(mockClearTenantContext).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("hides user and navigation areas when user is missing", () => {
    mockUseCurrentUser.mockReturnValue({ user: null, refreshAction: vi.fn() });
    mockCanFilterByTenantContext.mockReturnValue(false);

    render(<Header />);

    expect(screen.getByTestId("main-nav")).toHaveTextContent("visible:false");
    expect(screen.queryByText(/^User:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^TenantSwitcher:/)).not.toBeInTheDocument();
  });
});

