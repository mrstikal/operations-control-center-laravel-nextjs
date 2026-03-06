import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDepartmentManagement } from "@/hooks/departments/useDepartmentManagement";

const mockConfirmAction = vi.hoisted(() => vi.fn());
const mockSuccessAction = vi.hoisted(() => vi.fn());
const mockErrorAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/lib/api/departments", () => ({
  listDepartments: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
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

import { getMe } from "@/lib/api";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "@/lib/api/departments";

describe("useDepartmentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getMe).mockResolvedValue({
      success: true,
      message: "",
      data: {
        id: 1,
        name: "Superadmin",
        email: "admin@test.local",
        tenant_id: 1,
        roles: [{ id: 1, name: "Superadmin", level: 5, description: "" }],
      },
    });

    vi.mocked(listDepartments).mockResolvedValue({
      success: true,
      message: "",
      data: [{ id: 1, tenant_id: 1, name: "Operations", is_active: true }],
    });

    vi.mocked(createDepartment).mockResolvedValue({
      success: true,
      message: "",
      data: { id: 2, tenant_id: 1, name: "HR", is_active: true },
    });

    vi.mocked(updateDepartment).mockResolvedValue({
      success: true,
      message: "",
      data: { id: 1, tenant_id: 1, name: "Operations", is_active: false },
    });

    vi.mocked(deleteDepartment).mockResolvedValue({ success: true, message: "", data: null });
    mockConfirmAction.mockResolvedValue(true);
  });

  it("loads superadmin flag and departments", async () => {
    const { result } = renderHook(() => useDepartmentManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSuperadmin).toBe(true);
    expect(result.current.departments).toHaveLength(1);
  });

  it("creates department from modal state", async () => {
    const { result } = renderHook(() => useDepartmentManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openCreateAction();
      result.current.setName("HR");
      result.current.setDescription("People ops");
      result.current.setIsActive(true);
    });

    await act(async () => {
      await result.current.saveDepartmentAction();
    });

    expect(createDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ name: "HR", description: "People ops" })
    );
    expect(mockSuccessAction).toHaveBeenCalled();
  });

  it("confirms delete and calls API", async () => {
    const { result } = renderHook(() => useDepartmentManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteDepartmentAction({
        id: 1,
        tenant_id: 1,
        name: "Operations",
        is_active: true,
      });
    });

    expect(mockConfirmAction).toHaveBeenCalled();
    expect(deleteDepartment).toHaveBeenCalledWith(1);
    expect(mockSuccessAction).toHaveBeenCalledWith("Department deleted successfully.");
  });
});

