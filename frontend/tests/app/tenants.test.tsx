// app/tenants/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenantsForManagement: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  archiveTenant: vi.fn(),
  archiveTenantWithTransfer: vi.fn(),
  getTenantUsersForTransfer: vi.fn(),
  isTenantArchiveConflict: vi.fn(),
  restoreTenant: vi.fn(),
}));

const mockErrorAction = vi.fn();
const mockSuccessAction = vi.fn();
const mockInfoAction = vi.fn();

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    errorAction: mockErrorAction,
    successAction: mockSuccessAction,
    infoAction: mockInfoAction,
  }),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TenantsPage from "@/app/tenants/page";
import { getMe } from "@/lib/api";
import {
  archiveTenantWithTransfer,
  getTenantUsersForTransfer,
  listTenantsForManagement,
} from "@/lib/api/tenants";

const mockedGetMe = vi.mocked(getMe);
const mockedListTenantsForManagement = vi.mocked(listTenantsForManagement);
const mockedArchiveTenantWithTransfer = vi.mocked(archiveTenantWithTransfer);
const mockedGetTenantUsersForTransfer = vi.mocked(getTenantUsersForTransfer);

const superadminMe = {
  success: true,
  message: "",
  data: {
    id: 1,
    name: "Superadmin",
    email: "sa@test.local",
    tenant_id: 1,
    roles: [{ id: 1, name: "Superadmin", level: 5, description: "" }],
  },
};

describe("TenantsPage", () => {
  async function openTransferModal(user: ReturnType<typeof userEvent.setup>) {
    mockedListTenantsForManagement.mockResolvedValue({
      success: true,
      message: "",
      data: [
        {
          id: 10,
          name: "Source Tenant",
          status: "active",
          description: null,
          deleted_at: null,
        },
      ],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });

    // Pre-check returns users — DELETE is never called, modal opens directly.
    mockedGetTenantUsersForTransfer.mockResolvedValue({
      success: true,
      message: "",
      data: {
        users_count: 1,
        users: [
          { id: 1, name: "Jane User", email: "jane@test.local", status: "active", created_at: "" },
        ],
        available_tenants: [
          { id: 22, name: "Active Target", status: "active", deleted_at: null },
          { id: 33, name: "Archived Target", status: "inactive", deleted_at: "2025-01-01" },
        ],
      },
    });

    render(<TenantsPage />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Archive" }).length).toBe(1));
    await user.click(screen.getAllByRole("button", { name: "Archive" })[0]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Archive tenant/i })).toBeInTheDocument()
    );
    await user.click(screen.getAllByRole("button", { name: "Archive" })[1]);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Archive tenant requires user transfer/i })
      ).toBeInTheDocument()
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetMe.mockResolvedValue(superadminMe);
    mockedListTenantsForManagement.mockResolvedValue({
      success: true,
      message: "",
      data: [],
      pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    });
  });

  it("shows the Tenants heading once data is resolved for a superadmin", async () => {
    render(<TenantsPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Tenants/i })).toBeInTheDocument()
    );
    expect(mockedListTenantsForManagement).toHaveBeenCalled();
  });

  it("shows access denied for non-superadmin users", async () => {
    mockedGetMe.mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 2,
        name: "Viewer",
        email: "viewer@test.local",
        tenant_id: 1,
        roles: [{ id: 2, name: "Viewer", level: 1, description: "" }],
      },
    });

    render(<TenantsPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Access denied\. Tenant management is available only for Superadmin\./i)
      ).toBeInTheDocument()
    );
    expect(mockedListTenantsForManagement).not.toHaveBeenCalled();
  });

  it("shows empty state when no tenants are returned", async () => {
    render(<TenantsPage />);

    await waitFor(() => expect(screen.getByText("No tenants found.")).toBeInTheDocument());
  });

  it("opens transfer modal when tenant has users and lists only non-archived targets", async () => {
    const user = userEvent.setup();
    await openTransferModal(user);

    await user.click(screen.getByPlaceholderText("Select target tenant"));

    expect(screen.getByText("Active Target")).toBeInTheDocument();
    expect(screen.queryByText("Archived Target")).not.toBeInTheDocument();
  });

  it("keeps transfer submit disabled until target tenant is selected", async () => {
    const user = userEvent.setup();

    await openTransferModal(user);

    const submitButton = screen.getByRole("button", { name: /Transfer users and archive/i });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(mockedArchiveTenantWithTransfer).not.toHaveBeenCalled();
  });

  it("submits transfer, closes modal and refreshes tenants", async () => {
    const user = userEvent.setup();
    mockedArchiveTenantWithTransfer.mockResolvedValue({
      success: true,
      message: "ok",
      data: { moved_users_count: 1, source_tenant_id: 10, target_tenant_id: 22 },
    });

    await openTransferModal(user);

    await user.click(screen.getByPlaceholderText("Select target tenant"));
    await user.click(screen.getByText("Active Target"));
    await user.click(screen.getByRole("button", { name: /Transfer users and archive/i }));

    await waitFor(() =>
      expect(mockedArchiveTenantWithTransfer).toHaveBeenCalledWith(10, 22)
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: /Archive tenant requires user transfer/i })
      ).not.toBeInTheDocument()
    );
    expect(mockedListTenantsForManagement.mock.calls.length).toBeGreaterThan(1);
    expect(mockSuccessAction).toHaveBeenCalled();
  });

  it("shows error toast when transfer API fails and keeps modal open", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedArchiveTenantWithTransfer.mockRejectedValue(new Error("Transfer failed"));

    try {
      await openTransferModal(user);

      await user.click(screen.getByPlaceholderText("Select target tenant"));
      await user.click(screen.getByText("Active Target"));
      await user.click(screen.getByRole("button", { name: /Transfer users and archive/i }));

      await waitFor(() => expect(mockErrorAction).toHaveBeenCalledWith("Transfer failed"));
      expect(
        screen.getByRole("heading", { name: /Archive tenant requires user transfer/i })
      ).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to transfer users and archive tenant:",
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
