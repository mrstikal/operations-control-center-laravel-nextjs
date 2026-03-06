// app/login/page.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, setToken: vi.fn() };
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { login } from "@/lib/api";
import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("renders the OCC Login heading", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /OCC Login/i })).toBeInTheDocument();
  });

  it("renders email and password input fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("does not redirect before submit", () => {
    render(<LoginPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows an error message when login fails", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument());
  });

  it("redirects to /dashboard on a successful login", async () => {
    vi.mocked(login).mockResolvedValue({
      success: true,
      message: "",
      data: { user: { id: 1, name: "Alice", email: "alice@test.local" } },
    });
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });
});
