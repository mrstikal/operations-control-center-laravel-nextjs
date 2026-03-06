// Covers: app/employees/page.tsx, app/employees/[id]/page.tsx,
//         app/employees/create/page.tsx, app/employees/[id]/edit/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseEmployeeManagement = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mockPush, back: mockBack }),
  useParams: () => ({ id: "1" }),
}));

const mockMe = vi.hoisted(() => ({
  id: 1,
  name: "Admin",
  email: "a@test.local",
  tenant_id: 1,
  roles: [],
  permissions: [],
  tenant: { id: 1, name: "ACME" },
  can_filter_by_tenant: false,
}));
const emptyList = vi.hoisted(() => ({
  success: true,
  message: "",
  data: [],
  pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn().mockResolvedValue({ success: true, message: "", data: mockMe }),
}));

vi.mock("@/lib/api/employees", () => ({
  listEmployees: vi.fn().mockResolvedValue(emptyList),
  getEmployeeById: vi
    .fn()
    .mockResolvedValue({
      success: true,
      message: "",
      data: { id: 1, name: "Alice", department: "Operations", position: "Technician" },
    }),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  restoreEmployee: vi.fn(),
  hardDeleteEmployee: vi.fn(),
}));

vi.mock("@/hooks/employees/useEmployeeManagement", () => ({
  useEmployeeManagement: mockUseEmployeeManagement,
}));

vi.mock("@/lib/api/metadata", () => ({
  getHRMetadata: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      departments: ["Operations"],
      availability_statuses: [],
      time_off_types: [],
      time_off_statuses: [],
    },
  }),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmployeesPage from "@/app/employees/page";
import EmployeeDetailPage from "@/app/employees/[id]/page";
import EmployeeCreatePage from "@/app/employees/create/page";
import EmployeeEditPage from "@/app/employees/[id]/edit/page";
import { getMe } from "@/lib/api";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  restoreEmployee,
  updateEmployee,
} from "@/lib/api/employees";

function createEmployeeManagementState(overrides: Record<string, unknown> = {}) {
  return {
    employees: [],
    loading: false,
    metadata: {
      departments: [],
      availability_statuses: [],
      time_off_types: [],
      time_off_statuses: [],
    },
    sort: "id:desc",
    page: 1,
    perPage: 15,
    pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
    canManageEmployees: true,
    canHardDeleteEmployees: true,
    isReadOnly: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChange: vi.fn(),
    handleSortChange: vi.fn(),
    goToCreateEmployeeAction: vi.fn(),
    viewEmployeeAction: vi.fn(),
    editEmployeeAction: vi.fn(),
    softDeleteEmployeeAction: vi.fn(),
    restoreEmployeeAction: vi.fn(),
    hardDeleteEmployeeAction: vi.fn(),
    ...overrides,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
describe("EmployeesPage (list)", () => {
  beforeEach(() => {
    mockUseEmployeeManagement.mockReturnValue(createEmployeeManagementState());
  });

  it("renders the Employees heading immediately", () => {
    render(<EmployeesPage />);
    expect(screen.getByRole("heading", { name: /Employees/i })).toBeTruthy();
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────
describe("EmployeeDetailPage", () => {
  it("renders without crashing", async () => {
    render(<EmployeeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Alice/i)).toBeTruthy();
      expect(screen.getByText(/Quick Stats/i)).toBeTruthy();
    });
  });

  it("soft-deletes employee and redirects to list for Manager+", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 1, name: "Manager", level: 3, description: "Manager role" }],
      },
    });

    render(<EmployeeDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteEmployee).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith("/employees");
    });
  });

  it("restores deleted employee for Superadmin", async () => {
    const user = userEvent.setup();
    vi.mocked(getMe).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        ...mockMe,
        roles: [{ id: 2, name: "Superadmin", level: 4, description: "Superadmin role" }],
      },
    });
    vi.mocked(getEmployeeById).mockResolvedValueOnce({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Alice",
        department: "Operations",
        position: "Technician",
        deleted_at: "2026-03-01T00:00:00Z",
      },
    } as Awaited<ReturnType<typeof getEmployeeById>>);

    render(<EmployeeDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Restore" }));

    await waitFor(() => {
      expect(restoreEmployee).toHaveBeenCalledWith(1);
    });
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("EmployeeCreatePage", () => {
  it("renders without crashing", async () => {
    render(<EmployeeCreatePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Create Employee/i })).toBeTruthy();
      expect(screen.getByRole("heading", { name: /Employee Information/i })).toBeTruthy();
    });
  });

  it("submits create form and redirects to employees", async () => {
    const user = userEvent.setup();

    render(<EmployeeCreatePage />);

    await user.type(await screen.findByPlaceholderText(/john\.smith@company\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/e\.g\. John Smith/i), "Alice");
    await user.type(screen.getByPlaceholderText(/Senior Technician/i), "Technician");
    await user.selectOptions(screen.getByRole("combobox"), "Operations");
    await user.click(screen.getByRole("button", { name: /Create Employee/i }));

    await waitFor(() => {
      expect(createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice",
          email: "alice@example.com",
          department: "Operations",
          position: "Technician",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/employees");
    });
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────
describe("EmployeeEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    render(<EmployeeEditPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Employee/i })).toBeTruthy();
      expect(screen.getByRole("heading", { name: /Employee Information/i })).toBeTruthy();
    });
  });

  it("submits employee edit form and redirects to detail", async () => {
    const user = userEvent.setup();
    vi.mocked(updateEmployee).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 1 },
    } as Awaited<ReturnType<typeof updateEmployee>>);

    render(<EmployeeEditPage />);

    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ department: "Operations", position: "Technician" })
      );
      expect(mockPush).toHaveBeenCalledWith("/employees/1");
    });
  });

  it("does not redirect when employee update fails", async () => {
    const user = userEvent.setup();
    vi.mocked(updateEmployee).mockRejectedValueOnce(new Error("Update failed"));

    render(<EmployeeEditPage />);

    await user.click(await screen.findByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("disables submit in archived tenant read-only mode", async () => {
    vi.mocked(getMe).mockResolvedValue({
      success: true,
      message: "",
      data: {
        ...mockMe,
        tenant: { ...mockMe.tenant, deleted_at: "2026-01-01T00:00:00Z" },
      },
    });

    render(<EmployeeEditPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeDisabled();
    });
  });
});
