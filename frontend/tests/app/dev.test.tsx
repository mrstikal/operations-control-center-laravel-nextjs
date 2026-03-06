// app/dev/phase1/page.tsx – no API calls, uses only static mock data
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Phase1DevPage from "@/app/dev/phase1/page";

describe("Phase1DevPage", () => {
  it("renders the Phase 1 Dev Harness heading", () => {
    render(<Phase1DevPage />);
    expect(screen.getByRole("heading", { name: /Phase 1 Dev Harness/i })).toBeInTheDocument();
  });

  it("renders all three mock data rows by default", () => {
    render(<Phase1DevPage />);
    expect(screen.getByText("Contract A")).toBeInTheDocument();
    expect(screen.getByText("Contract B")).toBeInTheDocument();
    expect(screen.getByText("Contract C")).toBeInTheDocument();
  });
});
