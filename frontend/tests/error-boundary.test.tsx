import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/app/error";

describe("ErrorBoundary Component", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should render error message", () => {
    const mockReset = vi.fn();
    const error = new Error("Test error message");

    render(<ErrorBoundary error={error} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/We apologize for the inconvenience/i)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Global error:", error);
  });

  it("should render try again button", () => {
    const mockReset = vi.fn();
    const error = new Error("Test error");

    render(<ErrorBoundary error={error} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
  });

  it("should call reset when try again button is clicked", async () => {
    const mockReset = vi.fn();
    const error = new Error("Test error");

    const user = userEvent.setup();
    render(<ErrorBoundary error={error} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalled();
  });

  it("should render back to login link", () => {
    const mockReset = vi.fn();
    const error = new Error("Test error");

    render(<ErrorBoundary error={error} reset={mockReset} />);

    const loginLink = screen.getByRole("link", { name: /back to login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("should show error details in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    const mockReset = vi.fn();
    const error = new Error("Test error details");
    error.stack = "Error: Test error details\n    at someFunction";

    render(<ErrorBoundary error={error} reset={mockReset} />);

    expect(screen.getByText(/Error details \(development only\)/i)).toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
