"use client";

import Link from "next/link";
import type { RefObject } from "react";
import HrMenu from "@/components/header/HrMenu";
import { MAIN_NAV_ITEMS } from "@/components/header/navigation";

type MainNavProps = {
  hasSuperadminRole: boolean;
  hrMenuRef: RefObject<HTMLDivElement | null>;
  isActiveAction: (path: string) => boolean;
  isHrActive: boolean;
  isHrMenuOpen: boolean;
  onToggleHrMenuAction: () => void;
  showNav: boolean;
};

export default function MainNav({
  hasSuperadminRole,
  hrMenuRef,
  isActiveAction,
  isHrActive,
  isHrMenuOpen,
  onToggleHrMenuAction,
  showNav,
}: MainNavProps) {
  if (!showNav) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1">
      {MAIN_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 rounded-sm text-sm font-medium transition ${
            isActiveAction(item.href)
              ? "bg-slate-700 text-white"
              : "text-gray-300 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          {item.label}
        </Link>
      ))}

      {hasSuperadminRole && (
        <Link
          href="/tenants"
          className={`px-3 py-2 rounded-sm text-sm font-medium transition ${
            isActiveAction("/tenants")
              ? "bg-slate-700 text-white"
              : "text-gray-300 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          Tenants
        </Link>
      )}

      <HrMenu
        containerRef={hrMenuRef}
        isActiveAction={isActiveAction}
        isHrActive={isHrActive}
        isOpen={isHrMenuOpen}
        onToggleAction={onToggleHrMenuAction}
      />
    </nav>
  );
}
