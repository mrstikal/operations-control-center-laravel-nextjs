import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetMaintenanceSchedules } from "@/hooks/assets/useAssetMaintenanceSchedules";
import type { MaintenanceSchedule } from "@/lib/types";

vi.mock("@/lib/api/assets", () => ({
  listAssetMaintenanceSchedules: vi.fn(),
  createAssetMaintenanceSchedule: vi.fn(),
  updateAssetMaintenanceSchedule: vi.fn(),
  deleteAssetMaintenanceSchedule: vi.fn(),
}));

import {
  createAssetMaintenanceSchedule,
  deleteAssetMaintenanceSchedule,
  listAssetMaintenanceSchedules,
  updateAssetMaintenanceSchedule,
} from "@/lib/api/assets";

const sampleSchedule: MaintenanceSchedule = {
  id: 22,
  asset_id: 7,
  frequency: "monthly",
  interval_days: 30,
  description: "Monthly preventive",
  next_due_date: "2026-04-10",
  is_active: true,
  due_state: "ok",
};

describe("useAssetMaintenanceSchedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listAssetMaintenanceSchedules).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleSchedule],
      pagination: { total: 1, per_page: 10, current_page: 1, last_page: 1 },
    });

    vi.mocked(createAssetMaintenanceSchedule).mockResolvedValue({
      success: true,
      message: "",
      data: { schedule: sampleSchedule },
    });

    vi.mocked(updateAssetMaintenanceSchedule).mockResolvedValue({
      success: true,
      message: "",
      data: { schedule: { ...sampleSchedule, interval_days: 45 } },
    });

    vi.mocked(deleteAssetMaintenanceSchedule).mockResolvedValue({
      success: true,
      message: "",
      data: null,
    });
  });

  it("loads maintenance schedules on mount", async () => {
    const { result } = renderHook(() => useAssetMaintenanceSchedules(7));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([sampleSchedule]);
    expect(listAssetMaintenanceSchedules).toHaveBeenCalledWith(7, { page: 1, per_page: 10 });
  });

  it("resets page when filters change", async () => {
    const { result } = renderHook(() => useAssetMaintenanceSchedules(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(5);
      result.current.handleFilterChange({ overdue: "1" });
    });

    await waitFor(() =>
      expect(listAssetMaintenanceSchedules).toHaveBeenLastCalledWith(7, {
        overdue: "1",
        page: 1,
        per_page: 10,
      })
    );
  });

  it("supports create/update/delete flow", async () => {
    const { result } = renderHook(() => useAssetMaintenanceSchedules(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitForm({
        frequency: "monthly",
        description: "Created schedule",
      });
    });

    expect(createAssetMaintenanceSchedule).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ description: "Created schedule" })
    );

    act(() => {
      result.current.openEditForm(sampleSchedule);
    });

    await act(async () => {
      await result.current.submitForm({
        frequency: "custom",
        interval_days: 45,
        description: "Edited schedule",
      });
    });

    expect(updateAssetMaintenanceSchedule).toHaveBeenCalledWith(
      7,
      sampleSchedule.id,
      expect.objectContaining({ description: "Edited schedule", interval_days: 45 })
    );

    await act(async () => {
      await result.current.deleteSchedule(sampleSchedule.id);
    });

    expect(deleteAssetMaintenanceSchedule).toHaveBeenCalledWith(7, sampleSchedule.id);
  });
});

