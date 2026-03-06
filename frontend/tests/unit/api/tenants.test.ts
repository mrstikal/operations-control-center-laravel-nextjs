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
  archiveTenant,
  archiveTenantWithTransfer,
  createTenant,
  getTenantUsersForTransfer,
  isTenantArchiveConflict,
  listTenants,
  listTenantsForManagement,
  restoreTenant,
  updateTenant,
} from "@/lib/api/tenants";

describe("tenants API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list endpoints with optional query parameters", async () => {
    const listResponse = { success: true, message: "", data: [] };
    const managementResponse = { success: true, message: "", data: [] };

    mockGet.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(managementResponse);

    const listQuery = { include_archived: true };
    const managementQuery = {
      search: "ops",
      status: "archived" as const,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
      per_page: 20,
      page: 2,
    };

    await expect(listTenants(listQuery)).resolves.toBe(listResponse);
    await expect(listTenantsForManagement(managementQuery)).resolves.toBe(managementResponse);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/tenants", listQuery);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/tenants/manage", managementQuery);
  });

  it("forwards create/update/archive/restore tenant actions", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 1 } });
    mockPut.mockResolvedValue({ success: true, message: "", data: { id: 1 } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    await createTenant({ name: "Tenant A", status: "active" });
    await updateTenant(1, { description: "Updated" });
    await archiveTenant(1);
    await restoreTenant(1);

    expect(mockPost).toHaveBeenNthCalledWith(1, "/tenants/manage", {
      name: "Tenant A",
      status: "active",
    });
    expect(mockPut).toHaveBeenCalledWith("/tenants/manage/1", { description: "Updated" });
    expect(mockDel).toHaveBeenCalledWith("/tenants/manage/1");
    expect(mockPost).toHaveBeenNthCalledWith(2, "/tenants/manage/1/restore");
  });

  it("forwards transfer preparation and archive with transfer payload", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      message: "",
      data: { users_count: 2, users: [], available_tenants: [] },
    });
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "",
      data: { moved_users_count: 2, source_tenant_id: 1, target_tenant_id: 8 },
    });

    await getTenantUsersForTransfer(1);
    await archiveTenantWithTransfer(1, "8");

    expect(mockGet).toHaveBeenCalledWith("/tenants/manage/1/users-for-transfer");
    expect(mockPost).toHaveBeenCalledWith("/tenants/manage/1/archive-with-transfer", {
      target_tenant_id: 8,
    });
  });

  it("detects tenant archive conflict errors correctly", () => {
    const conflictError = {
      status: 409,
      data: { code: "TENANT_HAS_USERS", users_count: 4 },
    } as const;

    expect(isTenantArchiveConflict(conflictError)).toBe(true);
    expect(isTenantArchiveConflict({ status: 409, data: { code: "OTHER" } })).toBe(false);
    expect(isTenantArchiveConflict({ status: 500, data: { code: "TENANT_HAS_USERS" } })).toBe(false);
    expect(isTenantArchiveConflict(null)).toBe(false);
  });

  it("propagates API errors", async () => {
    const error = new Error("tenant management failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(listTenantsForManagement({ page: 1 })).rejects.toBe(error);
  });
});

