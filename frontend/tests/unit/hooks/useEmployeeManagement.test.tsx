import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEmployeeManagement } from "@/hooks/employees/useEmployeeManagement";
import type { Employee } from "@/lib/types";

const mockPush = vi.hoisted(() => vi.fn());
const mockConfirmAction = vi.hoisted(() => vi.fn());
const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockErrorAction = vi.hoisted(() => vi.fn());
const mockedCurrentUser = vi.hoisted(() => ({
  id: 1,
  name: "Admin",
  email: "admin@test.local",
  tenant_id: 1,
  tenant: { id: 1, name: "ACME" },
  roles: [{ id: 1, name: "Admin", level: 4, description: "" }],
  permissions: [],
  can_filter_by_tenant: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/employees", () => ({
  listEmployees: vi.fn(),
  deleteEmployee: vi.fn(),
  restoreEmployee: vi.fn(),
  hardDeleteEmployee: vi.fn(),
}));

vi.mock("@/lib/api/tenants", () => ({
  listTenants: vi.fn(),
}));

vi.mock("@/lib/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirmAction: mockConfirmAction }),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    successAction: mockSuccessAction,
    errorAction: mockErrorAction,
    infoAction: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: mockedCurrentUser,
    loading: false,
    refreshAction: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useHRMetadata", () => ({
  useHRMetadata: () => ({
    metadata: {
      departments: ["Operations", "HR"],
      availability_statuses: [{ label: "Available", value: "available" }],
      time_off_types: [],
      time_off_statuses: [],
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/lib/hooks/useTenantReadOnly", () => ({
  useTenantReadOnly: () => ({
    isReadOnly: false,
    tenantName: "ACME",
    message: "Tenant ACME is archived; this page is read-only.",
  }),
}));

import {
  deleteEmployee,
  hardDeleteEmployee,
  listEmployees,
  restoreEmployee,
} from "@/lib/api/employees";
import { listTenants } from "@/lib/api/tenants";

const baseEmployee: Employee = {
  id: 1,
  name: "Alice Johnson",
  email: "alice@test.local",
  department: "Operations",
  position: "Operator",
  availability_status: "available",
};

describe("useEmployeeManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    vi.mocked(listEmployees).mockResolvedValue({
      success: true,
      message: "",
      data: [baseEmployee],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    });
    vi.mocked(listTenants).mockResolvedValue({
      success: true,
      message: "",
      data: [],
    });
    mockConfirmAction.mockResolvedValue(true);
  });

  it("loads employees and exposes role-based flags", async () => {
    const { result } = renderHook(() => useEmployeeManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listEmployees).toHaveBeenCalledWith({
      page: 1,
      per_page: 15,
      sort_by: "id",
      sort_order: "desc",
    });
    expect(result.current.employees).toEqual([baseEmployee]);
    expect(result.current.canManageEmployees).toBe(true);
    expect(result.current.canHardDeleteEmployees).toBe(true);
  });

  it("applies debounced search filters and resets the page", async () => {
    const { result } = renderHook(() => useEmployeeManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(listEmployees).mockClear();

    vi.useFakeTimers();

    await act(async () => {
      result.current.setPage(3);
      result.current.handleFilterChange({
        search: "Grace",
        department: "Operations",
        status: "available",
      });
    });

    expect(result.current.page).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(listEmployees).toHaveBeenLastCalledWith({
      search: "Grace",
      department: "Operations",
      status: "available",
      page: 1,
      per_page: 15,
      sort_by: "id",
      sort_order: "desc",
    });
  });

  it("soft deletes an employee and refreshes the list after confirmation", async () => {
    vi.mocked(deleteEmployee).mockResolvedValue({ success: true, message: "", data: null });

    const { result } = renderHook(() => useEmployeeManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(listEmployees).mockClear();

    await act(async () => {
      await result.current.softDeleteEmployeeAction(baseEmployee);
    });

    expect(mockConfirmAction).toHaveBeenCalled();
    expect(deleteEmployee).toHaveBeenCalledWith(baseEmployee.id);
    expect(listEmployees).toHaveBeenCalledTimes(1);
    expect(mockSuccessAction).toHaveBeenCalledWith("Employee deleted successfully");
  });

  it("restores and hard deletes deleted employees with the expected API calls", async () => {
    vi.mocked(restoreEmployee).mockResolvedValue({ success: true, message: "", data: baseEmployee });
    vi.mocked(hardDeleteEmployee).mockResolvedValue({ success: true, message: "", data: null });

    const { result } = renderHook(() => useEmployeeManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.restoreEmployeeAction({ ...baseEmployee, deleted_at: "2026-03-01" });
      await result.current.hardDeleteEmployeeAction({ ...baseEmployee, deleted_at: "2026-03-01" });
    });

    expect(restoreEmployee).toHaveBeenCalledWith(baseEmployee.id);
    expect(hardDeleteEmployee).toHaveBeenCalledWith(baseEmployee.id);
    expect(mockSuccessAction).toHaveBeenCalledWith("Employee restored successfully");
    expect(mockSuccessAction).toHaveBeenCalledWith("Employee permanently deleted");
  });
});

