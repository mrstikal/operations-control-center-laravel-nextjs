import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import GlobalSearchBox from "@/components/header/GlobalSearchBox";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/search/useGlobalSearch", () => ({
  useGlobalSearch: vi.fn(),
}));

import { useGlobalSearch } from "@/hooks/search/useGlobalSearch";

describe("GlobalSearchBox", () => {
  it("shows search results in dropdown", () => {
    const setQuery = vi.fn();
    vi.mocked(useGlobalSearch).mockReturnValue({
      query: "Pump",
      setQuery,
      loading: false,
      error: null,
      hasSearched: true,
      minQueryLength: 2,
      results: [
        {
          id: 1,
          tenant_id: 1,
          type: "contract",
          indexable_id: 10,
          title: "Pump outage",
          subtitle: "CTR-001",
          status: "in_progress",
          action_url: "/contracts/10",
          snippet: "Snippet",
          indexed_at: null,
          updated_at: null,
        },
      ],
    });

    render(<GlobalSearchBox />);

    fireEvent.focus(screen.getByLabelText(/global search/i));

    expect(screen.getByText("Pump outage")).toBeInTheDocument();
    expect(screen.getByText("Contract")).toBeInTheDocument();
  });
});

