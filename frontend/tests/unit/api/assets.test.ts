import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
  patch: mockPatch,
  del: mockDel,
}));

import {
  createAsset,
  createAssetMaintenanceLog,
  createAssetMaintenanceSchedule,
  deleteAsset,
  deleteAssetMaintenanceLog,
  deleteAssetMaintenanceSchedule,
  disposeAsset,
  getAssetAuditTrail,
  getAssetById,
  hardDeleteAsset,
  listAssetMaintenanceLogs,
  listAssetMaintenanceSchedules,
  listAssets,
  listMaintenanceLogs,
  listMaintenanceSchedules,
  reassignAsset,
  restoreAsset,
  retireAsset,
  transferAsset,
  updateAsset,
  updateAssetMaintenanceLog,
  updateAssetMaintenanceSchedule,
  updateAssetStatus,
} from "@/lib/api/assets";

describe("assets API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list, detail, create and update calls to the API client", async () => {
    const listResponse = { success: true, message: "", data: [] };
    const detailResponse = { success: true, message: "", data: { id: 7 } };
    const createResponse = { success: true, message: "", data: { id: 8 } };
    const updateResponse = { success: true, message: "", data: { id: 9 } };

    mockGet.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(detailResponse);
    mockPost.mockResolvedValueOnce(createResponse);
    mockPut.mockResolvedValueOnce(updateResponse);

    const query = { search: "server", page: 2, archived: false };
    const options = { skipTenantHeader: true };
    const payload = { name: "Rack A" };

    await expect(listAssets(query, options)).resolves.toBe(listResponse);
    await expect(getAssetById(7)).resolves.toBe(detailResponse);
    await expect(createAsset(payload)).resolves.toBe(createResponse);
    await expect(updateAsset(9, { status: "active", reason: "approved" })).resolves.toBe(
      updateResponse
    );

    expect(mockGet).toHaveBeenNthCalledWith(1, "/assets", query, options);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/assets/7");
    expect(mockPost).toHaveBeenCalledWith("/assets", payload);
    expect(mockPut).toHaveBeenCalledWith("/assets/9", { status: "active", reason: "approved" });
  });

  it("encodes reason-based asset actions correctly", async () => {
    mockDel.mockResolvedValue({ success: true, message: "", data: null });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 1 } });
    mockPut.mockResolvedValue({ success: true, message: "", data: { id: 1 } });

    await deleteAsset(5, "Needs review & sign-off");
    await restoreAsset(5, "Recovered from archive");
    await hardDeleteAsset(5, "Duplicate / invalid");
    await updateAssetStatus(5, "maintenance", "Scheduled inspection");

    expect(mockDel).toHaveBeenNthCalledWith(
      1,
      "/assets/5?reason=Needs%20review%20%26%20sign-off"
    );
    expect(mockPost).toHaveBeenCalledWith("/assets/5/restore", {
      reason: "Recovered from archive",
    });
    expect(mockDel).toHaveBeenNthCalledWith(
      2,
      "/assets/5/hard-delete?reason=Duplicate%20%2F%20invalid"
    );
    expect(mockPut).toHaveBeenCalledWith("/assets/5", {
      status: "maintenance",
      reason: "Scheduled inspection",
    });
  });

  it("forwards audit trail and maintenance list queries", async () => {
    mockGet.mockResolvedValue({ success: true, message: "", data: [] });

    const auditQuery: Parameters<typeof getAssetAuditTrail>[1] = {
      page: 3,
      per_page: 50,
      user_id: 12,
    };
    const logQuery: Parameters<typeof listAssetMaintenanceLogs>[1] = {
      page: 1,
      per_page: 25,
      type: "preventive",
    };
    const globalLogQuery: Parameters<typeof listMaintenanceLogs>[0] = {
      asset_name: "generator",
      page: 2,
    };
    const scheduleQuery: Parameters<typeof listAssetMaintenanceSchedules>[1] = {
      due_state: "overdue",
      page: 2,
    };
    const globalScheduleQuery: Parameters<typeof listMaintenanceSchedules>[0] = {
      asset_id: 7,
      overdue: true,
    };

    await getAssetAuditTrail(7, auditQuery);
    await listAssetMaintenanceLogs(7, logQuery);
    await listMaintenanceLogs(globalLogQuery);
    await listAssetMaintenanceSchedules(7, scheduleQuery);
    await listMaintenanceSchedules(globalScheduleQuery);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/assets/7/audit-trail", auditQuery);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/assets/7/maintenance-logs", logQuery);
    expect(mockGet).toHaveBeenNthCalledWith(3, "/maintenance-logs", globalLogQuery);
    expect(mockGet).toHaveBeenNthCalledWith(
      4,
      "/assets/7/maintenance-schedules",
      scheduleQuery
    );
    expect(mockGet).toHaveBeenNthCalledWith(5, "/maintenance-schedules", globalScheduleQuery);
  });

  it("calls nested maintenance log endpoints with the provided payloads", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: { maintenance_log: { id: 2 } } });
    mockPatch.mockResolvedValue({ success: true, message: "", data: { maintenance_log: { id: 2 } } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    const createPayload = {
      title: "Quarterly service",
      performed_at: "2026-03-10",
      notes: "Completed",
    };
    const updatePayload = { notes: "Updated notes" };

    await createAssetMaintenanceLog(11, createPayload as never);
    await updateAssetMaintenanceLog(11, 22, updatePayload as never);
    await deleteAssetMaintenanceLog(11, 22);

    expect(mockPost).toHaveBeenCalledWith("/assets/11/maintenance-logs", createPayload);
    expect(mockPatch).toHaveBeenCalledWith("/assets/11/maintenance-logs/22", updatePayload);
    expect(mockDel).toHaveBeenCalledWith("/assets/11/maintenance-logs/22");
  });

  it("calls nested maintenance schedule endpoints with the provided payloads", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: { schedule: { id: 3 } } });
    mockPatch.mockResolvedValue({ success: true, message: "", data: { schedule: { id: 3 } } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    const createPayload = {
      title: "HVAC check",
      frequency_unit: "month",
      frequency_value: 3,
    };
    const updatePayload = { frequency_value: 6 };

    await createAssetMaintenanceSchedule(15, createPayload as never);
    await updateAssetMaintenanceSchedule(15, 33, updatePayload as never);
    await deleteAssetMaintenanceSchedule(15, 33);

    expect(mockPost).toHaveBeenCalledWith("/assets/15/maintenance-schedules", createPayload);
    expect(mockPatch).toHaveBeenCalledWith(
      "/assets/15/maintenance-schedules/33",
      updatePayload
    );
    expect(mockDel).toHaveBeenCalledWith("/assets/15/maintenance-schedules/33");
  });

  it("forwards lifecycle payloads for retire, dispose, transfer and reassign", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 99 } });

    await retireAsset(20, "End of life", "2026-04-01");
    await disposeAsset(20, "Broken", "recycle", "2026-04-02");
    await transferAsset(20, { location: "Warehouse B", department: "Ops", reason: "Reorg" });
    await reassignAsset(20, { assigned_to: 44, reason: "Ownership change" });

    expect(mockPost).toHaveBeenNthCalledWith(1, "/assets/20/retire", {
      reason: "End of life",
      retirement_date: "2026-04-01",
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, "/assets/20/dispose", {
      reason: "Broken",
      disposal_method: "recycle",
      disposal_date: "2026-04-02",
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, "/assets/20/transfer", {
      location: "Warehouse B",
      department: "Ops",
      reason: "Reorg",
    });
    expect(mockPost).toHaveBeenNthCalledWith(4, "/assets/20/reassign", {
      assigned_to: 44,
      reason: "Ownership change",
    });
  });

  it("bubbles client errors without swallowing them", async () => {
    const error = new Error("asset update failed");
    mockPut.mockRejectedValueOnce(error);

    await expect(updateAsset(1, { name: "Broken asset" })).rejects.toBe(error);
  });
});

