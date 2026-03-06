// app/departments/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDepartmentManagement = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  getMe: vi.fn().mockResolvedValue({
    success: true,
    message: "",
    data: {
      id: 1,
      name: "Admin",
      email: "a@test.local",
      tenant_id: 1,
      roles: [{ id: 1, name: "Superadmin", level: 5 }],
    },
  }),
}));

vi.mock("@/lib/api/departments", () => ({
  listDepartments: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
}));

vi.mock("@/hooks/departments/useDepartmentManagement", () => ({
  useDepartmentManagement: mockUseDepartmentManagement,
}));

import { render, screen } from "@testing-library/react";
import DepartmentsPage from "@/app/departments/page";

function createDepartmentManagementState(overrides: Record<string, unknown> = {}) {
  return {
    departments: [],
    loading: true,
    isSuperadmin: true,
    saving: false,
    modalOpen: false,
    editing: null,
    name: "",
    description: "",
    isActive: true,
    reassignModalOpen: false,
    departmentToDelete: null,
    availableDepartments: [],
    targetDepartmentId: null,
    assignedCount: 0,
    setName: vi.fn(),
    setDescription: vi.fn(),
    setIsActive: vi.fn(),
    setTargetDepartmentId: vi.fn(),
    openCreateAction: vi.fn(),
    openEditAction: vi.fn(),
    closeModalAction: vi.fn(),
    saveDepartmentAction: vi.fn(),
    deleteDepartmentAction: vi.fn(),
    closeReassignModalAction: vi.fn(),
    reassignAndDeleteAction: vi.fn(),
    ...overrides,
  };
}

describe("DepartmentsPage", () => {
  beforeEach(() => {
    mockUseDepartmentManagement.mockReturnValue(createDepartmentManagementState());
  });

  it("shows the loading indicator initially", () => {
    render(<DepartmentsPage />);
    expect(screen.getByText(/Loading departments/i)).toBeTruthy();
  });
});
