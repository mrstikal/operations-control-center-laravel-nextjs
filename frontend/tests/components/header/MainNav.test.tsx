import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockHrMenu = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/header/HrMenu", () => ({
  default: (props: {
    isOpen: boolean;
    isHrActive: boolean;
    onToggleAction: () => void;
  }) => {
    mockHrMenu(props);
    return (
      <button aria-label="Toggle HR" onClick={props.onToggleAction}>
        HR Menu {props.isOpen ? "open" : "closed"} {props.isHrActive ? "active" : "inactive"}
      </button>
    );
  },
}));

import MainNav from "@/components/header/MainNav";

describe("MainNav", () => {
  it("returns null when navigation should be hidden", () => {
    const { container } = render(
      <MainNav
        hasSuperadminRole={false}
        hrMenuRef={createRef<HTMLDivElement>()}
        isActiveAction={() => false}
        isHrActive={false}
        isHrMenuOpen={false}
        onToggleHrMenuAction={vi.fn()}
        showNav={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders primary nav items and active route styling", () => {
    render(
      <MainNav
        hasSuperadminRole={false}
        hrMenuRef={createRef<HTMLDivElement>()}
        isActiveAction={(path) => path === "/incidents"}
        isHrActive={false}
        isHrMenuOpen={false}
        onToggleHrMenuAction={vi.fn()}
        showNav
      />
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Incidents" }).className).toContain("bg-slate-700");
    expect(screen.queryByRole("link", { name: "Tenants" })).not.toBeInTheDocument();
  });

  it("shows tenants link for superadmin and forwards HR toggle action", async () => {
    const user = userEvent.setup();
    const onToggleHrMenuAction = vi.fn();

    render(
      <MainNav
        hasSuperadminRole
        hrMenuRef={createRef<HTMLDivElement>()}
        isActiveAction={(path) => path === "/tenants"}
        isHrActive
        isHrMenuOpen
        onToggleHrMenuAction={onToggleHrMenuAction}
        showNav
      />
    );

    expect(screen.getByRole("link", { name: "Tenants" }).className).toContain("bg-slate-700");

    await user.click(screen.getByRole("button", { name: "Toggle HR" }));
    expect(onToggleHrMenuAction).toHaveBeenCalledTimes(1);

    expect(mockHrMenu).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true, isHrActive: true }),
    );
  });
});

