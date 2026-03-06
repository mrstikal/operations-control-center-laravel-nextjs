"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import { useNotificationManagement } from "@/hooks/notifications/useNotificationManagement";
import { formatDateTime } from "@/lib/formatters/date";
import { formatNotificationType } from "@/lib/formatters/notification";
import type { Notification } from "@/lib/types";
import Link from "next/link";

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-600";
    case "high":
      return "bg-orange-600";
    case "medium":
      return "bg-blue-600";
    case "low":
      return "bg-emerald-600";
    default:
      return "bg-slate-600";
  }
}

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    page,
    perPage,
    pagination,
    users,
    canFilterByUser,
    unreadCount,
    isReadOnly,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    viewNotificationAction,
    markReadAction,
    markAllReadAction,
  } = useNotificationManagement();

  const filterFields = useMemo<FilterField[]>(
    () => [
      ...(canFilterByUser
        ? [
            {
              key: "user_id",
              label: "User",
              type: "select",
              options: users.map((user) => ({
                label: `${user.name} (${user.email})`,
                value: String(user.id),
              })),
            } as FilterField,
          ]
        : []),
      {
        key: "read",
        label: "Read status",
        type: "select",
        options: [
          { label: "Unread", value: "0" },
          { label: "Read", value: "1" },
        ],
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: [
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
          { label: "Critical", value: "critical" },
        ],
      },
    ],
    [canFilterByUser, users]
  );

  const columns = useMemo<DataTableColumn<Notification>[]>(
    () => [
      {
        key: "status",
        label: "Status",
        render: (notification) => (
          <span
            className={`status-badge ${
              notification.read ? "bg-slate-500" : "bg-emerald-600"
            }`}
          >
            {notification.read ? "Read" : "Unread"}
          </span>
        ),
      },
      {
        key: "title",
        label: "Title",
        render: (notification) => (
          <div>
            <div className="font-medium text-slate-900">{notification.title}</div>
            <div className="text-xs text-slate-500 wrap-break-word">{notification.message}</div>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        render: (notification) => formatNotificationType(notification.type),
      },
      {
        key: "priority",
        label: "Priority",
        render: (notification) => (
          <span
            className={`status-badge ${priorityBadgeClass(
              notification.priority
            )}`}
          >
            {notification.priority}
          </span>
        ),
      },
      {
        key: "created_at",
        label: "Created",
        render: (notification) => formatDateTime(notification.created_at),
      },
    ],
    []
  );

  const actions = useMemo<DataTableAction<Notification>[]>(
    () => [
      {
        label: "Detail",
        onClick: viewNotificationAction,
      },
      {
        label: "Mark read",
        onClick: (notification) => {
          void markReadAction(notification);
        },
        isVisible: (notification) => !notification.read,
      },
    ],
    [markReadAction, viewNotificationAction]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-slate-600">Track personal and system notifications in one place.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notification-schedules"
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Manage schedules
          </Link>
          <span className="rounded-sm bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Unread: <strong>{unreadCount}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              void markAllReadAction();
            }}
            disabled={isReadOnly}
            className="rounded-sm bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      <FilterBar fields={filterFields} onChangeAction={handleFilterChangeAction} />

      <DataTable
        data={notifications}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No notifications found."
        rowKey={(row) => row.id}
      />

      <PaginationComponent
        pagination={pagination}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChangeAction={setPage}
        onPerPageChangeAction={setPerPage}
      />
    </div>
  );
}

