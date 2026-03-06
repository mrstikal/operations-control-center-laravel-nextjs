import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetMaintenanceLogs } from "@/hooks/assets/useAssetMaintenanceLogs";
import type { MaintenanceLog } from "@/lib/types";

vi.mock("@/lib/api/assets", () => ({
  listAssetMaintenanceLogs: vi.fn(),
  createAssetMaintenanceLog: vi.fn(),
  updateAssetMaintenanceLog: vi.fn(),
  deleteAssetMaintenanceLog: vi.fn(),
}));

import {
  createAssetMaintenanceLog,
  deleteAssetMaintenanceLog,
  listAssetMaintenanceLogs,
  updateAssetMaintenanceLog,
} from "@/lib/api/assets";

const sampleLog: MaintenanceLog = {
  id: 10,
  asset_id: 7,
  performed_by: 2,
  type: "preventive",
  description: "Oil replacement",
  performed_at: "2026-03-10",
};

describe("useAssetMaintenanceLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listAssetMaintenanceLogs).mockResolvedValue({
      success: true,
      message: "",
      data: [sampleLog],
      pagination: { total: 1, per_page: 10, current_page: 1, last_page: 1 },
    });

    vi.mocked(createAssetMaintenanceLog).mockResolvedValue({
      success: true,
      message: "",
      data: {
        asset: { id: 7, name: "Generator", status: "operational" },
        maintenance_log: sampleLog,
      },
    });

    vi.mocked(updateAssetMaintenanceLog).mockResolvedValue({
      success: true,
      message: "",
      data: { maintenance_log: { ...sampleLog, description: "Updated" } },
    });

    vi.mocked(deleteAssetMaintenanceLog).mockResolvedValue({
      success: true,
      message: "",
      data: null,
    });
  });

  it("loads maintenance logs on mount", async () => {
    const { result } = renderHook(() => useAssetMaintenanceLogs(7));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([sampleLog]);
    expect(listAssetMaintenanceLogs).toHaveBeenCalledWith(7, { page: 1, per_page: 10 });
  });

  it("resets page when filters change", async () => {
    const { result } = renderHook(() => useAssetMaintenanceLogs(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
      result.current.handleFilterChange({ type: "repair" });
    });

    await waitFor(() =>
      expect(listAssetMaintenanceLogs).toHaveBeenLastCalledWith(7, {
        type: "repair",
        page: 1,
        per_page: 10,
      })
    );
  });

  it("supports create/update/delete flow", async () => {
    const { result } = renderHook(() => useAssetMaintenanceLogs(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitForm({
        type: "preventive",
        description: "Created",
      });
    });

    expect(createAssetMaintenanceLog).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ description: "Created" })
    );

    act(() => {
      result.current.openEditForm(sampleLog);
    });

    await act(async () => {
      await result.current.submitForm({
        type: "repair",
        description: "Edited",
      });
    });

    expect(updateAssetMaintenanceLog).toHaveBeenCalledWith(
      7,
      sampleLog.id,
      expect.objectContaining({ description: "Edited", type: "repair" })
    );

    await act(async () => {
      await result.current.deleteLog(sampleLog.id);
    });

    expect(deleteAssetMaintenanceLog).toHaveBeenCalledWith(7, sampleLog.id);
  });
});

