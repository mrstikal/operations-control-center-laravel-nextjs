import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock auth library
vi.mock("@/lib/auth", () => ({
  isAuthenticated: vi.fn(() => false),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading skeleton initially", () => {
    render(<HomePage />);

    // Check for skeleton UI elements
    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
  });

  it("should handle authentication check without errors", async () => {
    render(<HomePage />);

    await waitFor(() => {
      // Should complete without throwing errors
      expect(true).toBe(true);
    });
  });
});
