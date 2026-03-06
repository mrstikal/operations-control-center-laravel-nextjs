import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import HrMenu from "@/components/header/HrMenu";

describe("HrMenu", () => {
  it("renders closed trigger and calls toggle action", async () => {
    const user = userEvent.setup();
    const onToggleAction = vi.fn();

    render(
      <HrMenu
        containerRef={createRef<HTMLDivElement>()}
        isActiveAction={() => false}
        isHrActive={false}
        isOpen={false}
        onToggleAction={onToggleAction}
      />
    );

    const button = screen.getByRole("button", { name: "HR" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(onToggleAction).toHaveBeenCalledTimes(1);
  });

  it("renders HR menu items when open", () => {
    render(
      <HrMenu
        containerRef={createRef<HTMLDivElement>()}
        isActiveAction={() => false}
        isHrActive={false}
        isOpen
        onToggleAction={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Departments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shifts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Time-Off" })).toBeInTheDocument();
  });

  it("applies active style for current HR route", () => {
    render(
      <HrMenu
        containerRef={createRef<HTMLDivElement>()}
        isActiveAction={(path) => path === "/departments"}
        isHrActive
        isOpen
        onToggleAction={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "HR" }).className).toContain("bg-slate-700");
    expect(screen.getByRole("link", { name: "Departments" }).className).toContain("bg-slate-700");
    expect(screen.getByRole("link", { name: "Employees" }).className).toContain("text-gray-300");
  });
});

