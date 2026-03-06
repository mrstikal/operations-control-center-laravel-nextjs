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
  assignEmployeesToShift,
  createShift,
  deleteShift,
  getShift,
  listShifts,
  removeEmployeeShiftAssignment,
  updateShift,
} from "@/lib/api/shifts";

describe("shifts API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list and detail requests", async () => {
    const listResponse = { success: true, message: "", data: [] };
    const detailResponse = { success: true, message: "", data: { id: 3 } };

    mockGet.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(detailResponse);

    await expect(listShifts()).resolves.toBe(listResponse);
    await expect(getShift(3)).resolves.toBe(detailResponse);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/shifts");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/shifts/3");
  });

  it("forwards create, update and delete calls", async () => {
    const createPayload = {
      name: "Morning",
      start_time: "08:00",
      end_time: "16:00",
      days_of_week: [1, 2, 3, 4, 5],
      is_active: true,
      description: "Main shift",
    };

    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 9 } });
    mockPut.mockResolvedValue({ success: true, message: "", data: { id: 9 } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    await createShift(createPayload);
    await updateShift(9, { name: "Morning updated", is_active: false });
    await deleteShift(9);

    expect(mockPost).toHaveBeenCalledWith("/shifts", createPayload);
    expect(mockPut).toHaveBeenCalledWith("/shifts/9", {
      name: "Morning updated",
      is_active: false,
    });
    expect(mockDel).toHaveBeenCalledWith("/shifts/9");
  });

  it("forwards assignment and unassignment endpoints with payload", async () => {
    mockPost.mockResolvedValue({ success: true, message: "", data: [] });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    await assignEmployeesToShift(12, [5, 6], "2026-03-14", "2026-03-21");
    await removeEmployeeShiftAssignment(44);

    expect(mockPost).toHaveBeenCalledWith("/shifts/12/assign", {
      employee_ids: [5, 6],
      start_date: "2026-03-14",
      end_date: "2026-03-21",
    });
    expect(mockDel).toHaveBeenCalledWith("/employee-shifts/44");
  });

  it("propagates API errors", async () => {
    const error = new Error("shift list failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(listShifts()).rejects.toBe(error);
  });
});

