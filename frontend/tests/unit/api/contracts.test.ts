import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
  del: mockDel,
}));

import {
  approveContract,
  changeContractStatus,
  createContract,
  createContractIncident,
  deleteContract,
  deleteContractIncident,
  getContractById,
  hardDeleteContract,
  listContractIncidents,
  listContracts,
  restoreContract,
  updateContract,
  updateContractIncident,
} from "@/lib/api/contracts";

describe("contracts API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list, detail, create and update contract requests", async () => {
    mockGet.mockResolvedValueOnce({ success: true, message: "", data: [] }).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 5 },
    });
    mockPost.mockResolvedValueOnce({ success: true, message: "", data: { id: 6 } });
    mockPut.mockResolvedValueOnce({ success: true, message: "", data: { id: 6 } });

    const query = {
      search: "renewal",
      status: "approved",
      sort: "-due_date",
      tenant_id: 4,
      incidents_presence: "with" as const,
    };
    const options = { skipTenantHeader: true };
    const payload = { title: "New contract" };

    await listContracts(query, options);
    await getContractById(5, { tenant_id: 4 }, options);
    await createContract(payload);
    await updateContract(6, { title: "Updated contract" });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/contracts", query, options);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/contracts/5", { tenant_id: 4 }, options);
    expect(mockPost).toHaveBeenCalledWith("/contracts", payload);
    expect(mockPut).toHaveBeenCalledWith("/contracts/6", { title: "Updated contract" });
  });

  it("calls delete, restore, approve and status change endpoints", async () => {
    mockDel.mockResolvedValue({ success: true, message: "", data: null });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 7 } });
    const options = { skipTenantHeader: true };
    const query = { tenant_id: 4 };

    await deleteContract(7);
    await restoreContract(7, query, options);
    await hardDeleteContract(7, query, options);
    await approveContract(7);
    await changeContractStatus(7, "blocked", "Vendor delay");

    expect(mockDel).toHaveBeenNthCalledWith(1, "/contracts/7");
    expect(mockPost).toHaveBeenNthCalledWith(1, "/contracts/7/restore?tenant_id=4", undefined, options);
    expect(mockDel).toHaveBeenNthCalledWith(2, "/contracts/7/hard-delete?tenant_id=4", options);
    expect(mockPost).toHaveBeenNthCalledWith(2, "/contracts/7/approve");
    expect(mockPost).toHaveBeenNthCalledWith(3, "/contracts/7/change-status", {
      status: "blocked",
      reason: "Vendor delay",
    });
  });

  it("forwards nested contract incident endpoints and payloads", async () => {
    mockGet.mockResolvedValue({ success: true, message: "", data: [] });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 8 } });
    mockPut.mockResolvedValue({ success: true, message: "", data: { id: 8 } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });
    const options = { skipTenantHeader: true };
    const query = { tenant_id: 3 };

    const createPayload = {
      title: "Missed SLA",
      description: "Service interruption exceeded target",
      severity: "high" as const,
      status: "open" as const,
    };
    const updatePayload = {
      title: "Missed SLA - updated",
      status: "resolved" as const,
    };

    await listContractIncidents(9, query, options);
    await createContractIncident(9, createPayload, query, options);
    await updateContractIncident(9, 12, updatePayload, query, options);
    await deleteContractIncident(9, 12, query, options);

    expect(mockGet).toHaveBeenCalledWith("/contracts/9/incidents", query, options);
    expect(mockPost).toHaveBeenCalledWith("/contracts/9/incidents?tenant_id=3", createPayload, options);
    expect(mockPut).toHaveBeenCalledWith("/contracts/9/incidents/12?tenant_id=3", updatePayload, options);
    expect(mockDel).toHaveBeenCalledWith("/contracts/9/incidents/12?tenant_id=3", options);
  });

  it("propagates client errors to callers", async () => {
    const error = new Error("contracts list failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(listContracts({ page: 2 })).rejects.toBe(error);
  });
});

