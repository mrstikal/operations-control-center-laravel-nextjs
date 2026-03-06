import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateHRMetadataCache, useHRMetadata } from "@/lib/hooks/useHRMetadata";

const mockMetadata = {
  departments: ["IT", "HR"],
  availability_statuses: [{ label: "Available", value: "available" }],
  time_off_types: [{ label: "Annual", value: "annual_leave" }],
  time_off_statuses: [{ label: "Pending", value: "pending" }],
};

vi.mock("@/lib/api/metadata", () => ({
  getHRMetadata: vi.fn(),
}));

import { getHRMetadata } from "@/lib/api/metadata";

describe("useHRMetadata", () => {
  beforeEach(() => {
    invalidateHRMetadataCache();
    vi.clearAllMocks();
  });

  it("starts in loading state", async () => {
    vi.mocked(getHRMetadata).mockResolvedValue({
      success: true,
      message: "",
      data: mockMetadata,
    });
    const { result } = renderHook(() => useHRMetadata());
    expect(result.current.loading).toBe(true);
    expect(result.current.metadata).toBeNull();
    // Wait for the async effect to complete to avoid act warnings
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("resolves metadata after a successful fetch", async () => {
    vi.mocked(getHRMetadata).mockResolvedValue({
      success: true,
      message: "",
      data: mockMetadata,
    });
    const { result } = renderHook(() => useHRMetadata());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.error).toBeNull();
  });

  it("sets error state when the API throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getHRMetadata).mockRejectedValue(new Error("Network error"));
    try {
      const { result } = renderHook(() => useHRMetadata());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.metadata).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to fetch HR metadata:",
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("reads from cache and skips the API call when cache is fresh", async () => {
    // Seed the cache manually
    localStorage.setItem("hr_metadata", JSON.stringify(mockMetadata));
    localStorage.setItem("hr_metadata_time", Date.now().toString());

    const { result } = renderHook(() => useHRMetadata());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getHRMetadata).not.toHaveBeenCalled();
    expect(result.current.metadata).toEqual(mockMetadata);
  });

  it("invalidateHRMetadataCache removes cached keys from localStorage", () => {
    localStorage.setItem("hr_metadata", "{}");
    localStorage.setItem("hr_metadata_time", "123");
    invalidateHRMetadataCache();
    expect(localStorage.getItem("hr_metadata")).toBeNull();
    expect(localStorage.getItem("hr_metadata_time")).toBeNull();
  });
});
