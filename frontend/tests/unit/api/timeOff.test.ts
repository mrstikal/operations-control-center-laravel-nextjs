import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
}));

import {
  archiveTimeOffRequest,
  createTimeOffRequest,
  decideTimeOffRequest,
  getTimeOffRequestById,
  listTimeOffRequests,
  updateTimeOffRequest,
} from "@/lib/api/timeOff";

describe("time off API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list and detail requests", async () => {
    const listResponse = { success: true, message: "", data: [] };
    const detailResponse = { success: true, message: "", data: { id: 4 } };

    mockGet.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(detailResponse);

    const query = {
      status: "pending",
      type: "vacation",
      from_date: "2026-03-01",
      to_date: "2026-03-31",
      page: 2,
      per_page: 50,
      sort_by: "requested_at",
      sort_order: "desc",
    };

    await expect(listTimeOffRequests(query)).resolves.toBe(listResponse);
    await expect(getTimeOffRequestById(4)).resolves.toBe(detailResponse);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/time-off", query);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/time-off/4");
  });

  it("maps archived status to show_archived query flag", async () => {
    mockGet.mockResolvedValue({ success: true, message: "", data: [] });

    const query = { status: "archived", page: 3 };

    await listTimeOffRequests(query);

    expect(mockGet).toHaveBeenCalledWith("/time-off", {
      page: 3,
      show_archived: true,
    });
    expect(query).toEqual({ status: "archived", page: 3 });
  });

  it("uses an empty query object when list is called without params", async () => {
    const listResponse = { success: true, message: "", data: [] };
    mockGet.mockResolvedValueOnce(listResponse);

    await expect(listTimeOffRequests()).resolves.toBe(listResponse);

    expect(mockGet).toHaveBeenCalledWith("/time-off", {});
  });

  it("forwards decide, archive, create and update payloads", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 7 } });
    mockPut.mockResolvedValue({ success: true, message: "", data: { id: 7 } });

    await decideTimeOffRequest(7, { status: "approved", approval_note: "Looks good" });
    await archiveTimeOffRequest(7);
    await createTimeOffRequest({
      employee_id: 10,
      start_date: "2026-04-10",
      end_date: "2026-04-12",
      type: "vacation",
      reason: "Family trip",
    });
    await updateTimeOffRequest(7, { reason: "Updated reason" });

    expect(mockPost).toHaveBeenNthCalledWith(1, "/time-off/7/decide", {
      status: "approved",
      approval_note: "Looks good",
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, "/time-off/7/archive");
    expect(mockPost).toHaveBeenNthCalledWith(3, "/time-off", {
      employee_id: 10,
      start_date: "2026-04-10",
      end_date: "2026-04-12",
      type: "vacation",
      reason: "Family trip",
    });
    expect(mockPut).toHaveBeenCalledWith("/time-off/7", { reason: "Updated reason" });
  });

  it("propagates API errors", async () => {
    const error = new Error("time off failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(listTimeOffRequests({ page: 1 })).rejects.toBe(error);
  });
});

