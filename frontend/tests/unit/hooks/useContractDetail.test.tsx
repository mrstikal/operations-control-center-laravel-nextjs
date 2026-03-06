import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());
const mockConfirmAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock("@/lib/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirmAction: mockConfirmAction }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api/contracts", () => ({
  getContractById: vi.fn(),
  approveContract: vi.fn(),
  deleteContract: vi.fn(),
  restoreContract: vi.fn(),
  hardDeleteContract: vi.fn(),
  createContractIncident: vi.fn(),
  updateContractIncident: vi.fn(),
  deleteContractIncident: vi.fn(),
  updateContract: vi.fn(),
}));

import { useContractDetail } from "@/hooks/contracts/useContractDetail";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  approveContract,
  createContractIncident,
  getContractById,
  updateContract,
} from "@/lib/api/contracts";
import type { Contract } from "@/lib/types";

const baseContract: Contract = {
  id: 1,
  title: "Contract Alpha",
  contract_number: "C-001",
  description: "Alpha description",
  status: "draft",
  priority: "medium",
  budget: 1000,
  spent: 250,
  created_at: "2026-03-01T00:00:00Z",
  incidents: [
    {
      id: 10,
      title: "Incident A",
      description: "Investigate A",
      severity: "medium",
      status: "open",
      reported_at: "2026-03-02T00:00:00Z",
    },
  ],
};

const editableUser = {
  user: {
    id: 1,
    tenant_id: 1,
    name: "Admin",
    email: "admin@test.local",
    tenant: { id: 1, name: "ACME" },
    permissions: [
      { resource: "contracts", action: "edit" },
      { resource: "contracts", action: "delete" },
      { resource: "contracts", action: "approve" },
    ],
  },
  loading: false,
  refreshAction: vi.fn(),
};

describe("useContractDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmAction.mockResolvedValue(true);
    vi.mocked(useCurrentUser).mockReturnValue(editableUser as ReturnType<typeof useCurrentUser>);
    vi.mocked(getContractById).mockResolvedValue({
      success: true,
      message: "",
      data: baseContract,
    });
  });

  it("loads contract detail, incidents and contract permissions", async () => {
    const { result } = renderHook(() => useContractDetail("1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.contract?.title).toBe("Contract Alpha");
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.canEditContracts).toBe(true);
    expect(result.current.canDeleteContracts).toBe(true);
    expect(result.current.canApproveContracts).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("loads contract detail with tenant scope when provided", async () => {
    renderHook(() => useContractDetail("1", { tenantId: 2 }));

    await waitFor(() =>
      expect(getContractById).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true })
    );
  });

  it("refreshes contract after approve action", async () => {
    vi.mocked(getContractById)
      .mockResolvedValueOnce({ success: true, message: "", data: baseContract })
      .mockResolvedValueOnce({
        success: true,
        message: "",
        data: { ...baseContract, status: "approved" },
      });

    const { result } = renderHook(() => useContractDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleApproveAction();
    });

    expect(approveContract).toHaveBeenCalledWith(1);
    await waitFor(() => expect(result.current.contract?.status).toBe("approved"));
  });

  it("parses numeric values when submitting contract edits", async () => {
    const { result } = renderHook(() => useContractDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleContractEditSubmitAction({
        title: "Updated Contract",
        contract_number: "C-002",
        budget: "1234.5",
        spent: "456.7",
        priority: "high",
        status: "approved",
      });
    });

    expect(updateContract).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        title: "Updated Contract",
        contract_number: "C-002",
        budget: 1234.5,
        spent: 456.7,
        priority: "high",
        status: "approved",
      })
    );
  });

  it("blocks incident creation in read-only mode", async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      ...editableUser,
      user: {
        ...editableUser.user,
        tenant_archived: true,
      },
    } as ReturnType<typeof useCurrentUser>);

    const { result } = renderHook(() => useContractDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openCreateIncidentModalAction();
    });

    expect(result.current.isCreateIncidentModalOpen).toBe(false);
    expect(result.current.errorMessage).toBe("Tenant is archived, this page is read-only.");
    expect(createContractIncident).not.toHaveBeenCalled();
  });
});
