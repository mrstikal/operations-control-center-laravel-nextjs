import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/icons", () => ({
  MaterialIcon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

import UserSection from "@/components/header/UserSection";

describe("UserSection", () => {
  it("renders user name, email, and a log-out button", () => {
    render(
      <UserSection
        email="bob@occ.local"
        name="Bob"
        onLogoutAction={vi.fn()}
        unreadNotificationsCount={0}
      />
    );

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@occ.local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("shows notification badge with unread count", () => {
    render(
      <UserSection
        email="bob@occ.local"
        name="Bob"
        onLogoutAction={vi.fn()}
        unreadNotificationsCount={4}
      />
    );

    expect(screen.getByText("4")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /notifications.*4 unread/i });
    expect(link).toHaveAttribute("href", "/notifications");
  });

  it("caps badge label at 99+ for large counts", () => {
    render(
      <UserSection
        email="bob@occ.local"
        name="Bob"
        onLogoutAction={vi.fn()}
        unreadNotificationsCount={150}
      />
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("hides badge when there are no unread notifications", () => {
    render(
      <UserSection
        email="bob@occ.local"
        name="Bob"
        onLogoutAction={vi.fn()}
        unreadNotificationsCount={0}
      />
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("calls logout callback when button is clicked", async () => {
    const user = userEvent.setup();
    const onLogoutAction = vi.fn();

    render(
      <UserSection
        email="bob@occ.local"
        name="Bob"
        onLogoutAction={onLogoutAction}
        unreadNotificationsCount={0}
      />
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(onLogoutAction).toHaveBeenCalledTimes(1);
  });
});

