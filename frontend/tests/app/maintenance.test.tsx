import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MaintenanceOverviewPage from "@/app/maintenance/page";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { listAssets, listMaintenanceLogs, listMaintenanceSchedules } from "@/lib/api/assets";
import type { ApiEnvelope, Asset, MaintenanceLog, MaintenanceSchedule } from "@/lib/types";

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api/assets", () => ({
  listAssets: vi.fn(),
  listMaintenanceLogs: vi.fn(),
  listMaintenanceSchedules: vi.fn(),
  createAssetMaintenanceLog: vi.fn(),
  updateAssetMaintenanceLog: vi.fn(),
  deleteAssetMaintenanceLog: vi.fn(),
  createAssetMaintenanceSchedule: vi.fn(),
  updateAssetMaintenanceSchedule: vi.fn(),
  deleteAssetMaintenanceSchedule: vi.fn(),
}));

const mockedUseCurrentUser = vi.mocked(useCurrentUser);
const mockedListAssets = vi.mocked(listAssets);
const mockedListMaintenanceLogs = vi.mocked(listMaintenanceLogs);
const mockedListMaintenanceSchedules = vi.mocked(listMaintenanceSchedules);

const pagination = { total: 1, per_page: 20, current_page: 1, last_page: 1 };

const assetRow: Asset = {
  id: 77,
  name: "Pump A",
  status: "operational",
};

const logRow: MaintenanceLog = {
  id: 101,
  asset_id: 77,
  type: "preventive",
  description: "Monthly check",
  performed_by: 9,
  performed_at: "2026-03-10",
  asset: { id: 77, name: "Pump A" },
  performed_by_user: { id: 9, name: "Tech User" },
};

const scheduleRow: MaintenanceSchedule = {
  id: 202,
  asset_id: 77,
  frequency: "monthly",
  interval_days: 30,
  description: "Monthly schedule",
  next_due_date: "2026-04-10",
  is_active: true,
  due_state: "ok",
  asset: { id: 77, name: "Pump A" },
};

function setUserPermissions(permissions: Array<{ resource: string; action: string }>) {
  mockedUseCurrentUser.mockReturnValue({
    user: {
      id: 1,
      name: "User",
      email: "user@test.local",
      tenant_id: 1,
      roles: [],
      permissions,
      tenant: { id: 1, name: "ACME" },
      can_filter_by_tenant: false,
    },
    loading: false,
    refreshAction: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  const assetsResponse = {
    success: true,
    message: "",
    data: [assetRow],
    pagination,
  } satisfies ApiEnvelope<Asset[]>;

  const logsResponse = {
    success: true,
    message: "",
    data: [logRow],
    pagination,
  } satisfies ApiEnvelope<MaintenanceLog[]>;

  const schedulesResponse = {
    success: true,
    message: "",
    data: [scheduleRow],
    pagination,
  } satisfies ApiEnvelope<MaintenanceSchedule[]>;

  mockedListAssets.mockResolvedValue(assetsResponse);

  mockedListMaintenanceLogs.mockResolvedValue(logsResponse);

  mockedListMaintenanceSchedules.mockResolvedValue(schedulesResponse);
});

describe("MaintenanceOverviewPage RBAC", () => {
  it("Technician sees maintenance write actions in Logs and Schedules", async () => {
    setUserPermissions([
      { resource: "assets", action: "view" },
      { resource: "assets", action: "log_maintenance" },
      { resource: "assets", action: "schedule_maintenance" },
    ]);

    render(<MaintenanceOverviewPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Log maintenance/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Edit$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Schedules/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add schedule/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Edit$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeTruthy();
    });
  });

  it("Viewer sees data but has no write actions", async () => {
    setUserPermissions([{ resource: "assets", action: "view" }]);

    render(<MaintenanceOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/Monthly check/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /\+ Log maintenance/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Schedules/i }));

    await waitFor(() => {
      expect(screen.getByText(/Monthly schedule/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /\+ Add schedule/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).toBeNull();
  });
});

