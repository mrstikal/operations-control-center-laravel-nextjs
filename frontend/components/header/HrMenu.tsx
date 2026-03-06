"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { HR_NAV_ITEMS } from "@/components/header/navigation";

type HrMenuProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  isActiveAction: (path: string) => boolean;
  isHrActive: boolean;
  isOpen: boolean;
  onToggleAction: () => void;
};

export default function HrMenu({
  containerRef,
  isActiveAction,
  isHrActive,
  isOpen,
  onToggleAction,
}: HrMenuProps) {
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggleAction}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`px-3 py-2 rounded-sm text-sm font-medium transition ${
          isHrActive || isOpen
            ? "bg-slate-700 text-white"
            : "text-gray-300 hover:text-white hover:bg-slate-700/50"
        }`}
      >
        HR
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-sm border border-gray-700 bg-gray-900/95 p-1 shadow-lg">
          {HR_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-sm px-3 py-2 text-sm transition ${
                isActiveAction(item.href)
                  ? "bg-slate-700 text-white"
                  : "text-gray-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
