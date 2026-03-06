import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalSearch } from "@/hooks/search/useGlobalSearch";

vi.mock("@/lib/api/search", () => ({
  searchGlobal: vi.fn(),
}));

import { searchGlobal } from "@/lib/api/search";

describe("useGlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces query and loads results", async () => {
    vi.useFakeTimers();

    vi.mocked(searchGlobal).mockResolvedValue({
      success: true,
      message: "",
      data: [
        {
          id: 1,
          tenant_id: 1,
          type: "contract",
          indexable_id: 10,
          title: "Pump outage",
          subtitle: "CTR-001",
          status: "in_progress",
          action_url: "/contracts/10",
          snippet: "Pump outage",
          indexed_at: null,
          updated_at: null,
        },
      ],
    });

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery("Pu");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    vi.useRealTimers();

    await waitFor(() => expect(searchGlobal).toHaveBeenCalledWith({ q: "Pu", per_page: 8 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe("Pump outage");
  });

  it("does not call API for too short query", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery("a");
      vi.advanceTimersByTime(300);
    });

    expect(searchGlobal).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });
});

