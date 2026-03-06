"use client";

import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import MaintenanceScheduleForm from "@/components/assets/detail/MaintenanceScheduleForm";
import { useAssetMaintenanceSchedules } from "@/hooks/assets/useAssetMaintenanceSchedules";
import type { MaintenanceSchedule } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

// ─── Due-state badge ──────────────────────────────────────────────────────────

function DueStateBadge({ state }: { state: MaintenanceSchedule["due_state"] }) {
  if (state === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Overdue
      </span>
    );
  }
  if (state === "due_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Due soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      OK
    </span>
  );
}

// ─── Filter config ────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

const ACTIVE_OPTIONS = [
  { label: "Active", value: "1" },
  { label: "Inactive", value: "0" },
];

const OVERDUE_OPTIONS = [
  { label: "Overdue only", value: "1" },
];

const filterFields: FilterField[] = [
  { key: "frequency", label: "Frequency", type: "select", options: FREQUENCY_OPTIONS },
  { key: "is_active", label: "Status", type: "select", options: ACTIVE_OPTIONS },
  { key: "overdue", label: "Overdue", type: "select", options: OVERDUE_OPTIONS },
  { key: "due_before", label: "Due before", type: "date" },
];

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(
  onEdit: (s: MaintenanceSchedule) => void,
  onDelete: (s: MaintenanceSchedule) => void,
  canWrite: boolean
): DataTableColumn<MaintenanceSchedule>[] {
  const cols: DataTableColumn<MaintenanceSchedule>[] = [
    {
      key: "due_state",
      label: "State",
      className: "w-28",
      render: (row) => <DueStateBadge state={row.due_state} />,
    },
    {
      key: "description",
      label: "Description",
      className: "min-w-56",
      render: (row) => <span className="line-clamp-2">{row.description}</span>,
    },
    {
      key: "frequency",
      label: "Frequency",
      className: "w-28",
      render: (row) => (
        <span className="capitalize">
          {row.frequency}
          {row.interval_days ? ` (${row.interval_days}d)` : ""}
        </span>
      ),
    },
    {
      key: "next_due_date",
      label: "Next due",
      className: "w-36",
      render: (row) => {
        const formatted = formatDateOrDash(row.next_due_date);
        const isOverdue = row.due_state === "overdue";
        return (
          <span className={isOverdue ? "font-semibold text-red-600" : ""}>
            {formatted}
          </span>
        );
      },
    },
    {
      key: "days_until_due",
      label: "Days left",
      className: "w-24",
      render: (row) => {
        if (row.due_state === "overdue") return <span className="font-semibold text-red-600">Overdue</span>;
        return row.days_until_due != null ? `${row.days_until_due}d` : "—";
      },
    },
    {
      key: "is_active",
      label: "Active",
      className: "w-20",
      render: (row) => (
        <span className={row.is_active ? "text-emerald-700" : "text-slate-400"}>
          {row.is_active ? "Yes" : "No"}
        </span>
      ),
    },
  ];

  if (canWrite) {
    cols.push({
      key: "actions" as keyof MaintenanceSchedule,
      label: "",
      className: "w-32",
      render: (row) => (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="rounded-sm border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="rounded-sm border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  return cols;
}

// ─── Main component ───────────────────────────────────────────────────────────

type AssetMaintenanceScheduleSectionProps = {
  assetId: number;
  canWrite: boolean;
};

export default function AssetMaintenanceScheduleSection({
  assetId,
  canWrite,
}: AssetMaintenanceScheduleSectionProps) {
  const {
    items,
    loading,
    error,
    pagination,
    page,
    perPage,
    setPage,
    setPerPage,
    handleFilterChange,
    formOpen,
    editingSchedule,
    mutating,
    mutateError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    deleteSchedule,
  } = useAssetMaintenanceSchedules(assetId);

  function handleDelete(schedule: MaintenanceSchedule) {
    if (window.confirm(`Delete schedule "${schedule.description}"?`)) {
      void deleteSchedule(schedule.id);
    }
  }

  const overdueCount = items.filter((s) => s.due_state === "overdue").length;
  const dueSoonCount = items.filter((s) => s.due_state === "due_soon").length;

  const columns = buildColumns(openEditForm, handleDelete, canWrite);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-800">Maintenance Schedules</h3>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {overdueCount} overdue
            </span>
          )}
          {dueSoonCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {dueSoonCount} due soon
            </span>
          )}
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-sm bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            + Add schedule
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <FilterBar fields={filterFields} onChangeAction={handleFilterChange} />

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        emptyText="No maintenance schedules configured."
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

      <MaintenanceScheduleForm
        key={editingSchedule?.id ?? "create"}
        isOpen={formOpen}
        editing={editingSchedule}
        loading={mutating}
        error={mutateError}
        onCloseAction={closeForm}
        onSubmitAction={submitForm}
      />
    </div>
  );
}

