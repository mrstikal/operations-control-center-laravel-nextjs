"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import { useNotificationScheduleManagement } from "@/hooks/notifications/useNotificationScheduleManagement";
import { formatDateTime } from "@/lib/formatters/date";
import { formatNotificationType } from "@/lib/formatters/notification";
import type { NotificationSchedule } from "@/lib/types";
import Link from "next/link";

export default function NotificationSchedulesPage() {
  const {
    schedules,
    loading,
    deletingId,
    page,
    perPage,
    pagination,
    isReadOnly,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    viewCreatePageAction,
    viewEditPageAction,
    deleteScheduleAction,
  } = useNotificationScheduleManagement();

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "trigger",
        label: "Trigger",
        type: "text",
        placeholder: "e.g. sla_breach",
      },
      {
        key: "is_active",
        label: "Activity",
        type: "select",
        options: [
          { label: "Active", value: "1" },
          { label: "Inactive", value: "0" },
        ],
      },
    ],
    []
  );

  const columns = useMemo<DataTableColumn<NotificationSchedule>[]>(
    () => [
      {
        key: "name",
        label: "Name",
        className: "font-medium",
      },
      {
        key: "notification_type",
        label: "Notification type",
        render: (schedule) => formatNotificationType(schedule.notification_type),
      },
      {
        key: "trigger",
        label: "Trigger",
        render: (schedule) => formatNotificationType(schedule.trigger),
      },
      {
        key: "is_active",
        label: "Status",
        render: (schedule) => (
          <span
            className={`rounded-sm px-2 py-1 text-xs font-medium text-white ${
              schedule.is_active ? "bg-emerald-600" : "bg-slate-600"
            }`}
          >
            {schedule.is_active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "updated_at",
        label: "Updated",
        render: (schedule) => formatDateTime(schedule.updated_at),
      },
    ],
    []
  );

  const actions = useMemo<DataTableAction<NotificationSchedule>[]>(
    () => [
      {
        label: "Edit",
        onClick: viewEditPageAction,
      },
      {
        label: "Delete",
        variant: "danger",
        onClick: (schedule) => {
          void deleteScheduleAction(schedule);
        },
        isDisabled: (schedule) => deletingId === schedule.id,
      },
    ],
    [deleteScheduleAction, deletingId, viewEditPageAction]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification schedules</h1>
          <p className="text-slate-600">Manage trigger rules and recipients for notification delivery.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to notifications
          </Link>
          <button
            type="button"
            onClick={viewCreatePageAction}
            disabled={isReadOnly}
            className="rounded-sm bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New schedule
          </button>
        </div>
      </div>

      <FilterBar fields={filterFields} onChangeAction={handleFilterChangeAction} />

      <DataTable
        data={schedules}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No schedules found."
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

