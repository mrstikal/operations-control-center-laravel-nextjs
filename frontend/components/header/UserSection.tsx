"use client";

import Link from "next/link";
import { MaterialIcon } from "@/lib/icons";

type UserSectionProps = {
  email: string;
  name: string;
  onLogoutAction: () => void;
  unreadNotificationsCount: number;
};

export default function UserSection({
  email,
  name,
  onLogoutAction,
  unreadNotificationsCount,
}: UserSectionProps) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/notifications"
        aria-label={`Notifications (${unreadNotificationsCount} unread)`}
        className="mr-1 relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-300 transition hover:bg-slate-700/50 hover:text-white"
      >
        <MaterialIcon name="notifications" className="text-[20px]" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4.5 h-4.5 rounded-full flex items-center justify-center bg-red-500 px-1 text-center text-[0.625rem] leading-none text-white">
            <span className="relative top-px">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>
          </span>
        )}
      </Link>

      <div className="flex flex-col border-l border-gray-700 pl-4">
        <span className="text-sm font-medium text-white">{name}</span>
        <span className="text-xs text-gray-400">{email}</span>
      </div>

      <button
        onClick={onLogoutAction}
        className="ml-4 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-sm transition"
      >
        Log out
      </button>
    </div>
  );
}
