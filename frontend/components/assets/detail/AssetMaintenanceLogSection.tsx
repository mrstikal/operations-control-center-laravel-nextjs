"use client";

import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import MaintenanceLogForm from "@/components/assets/detail/MaintenanceLogForm";
import { useAssetMaintenanceLogs } from "@/hooks/assets/useAssetMaintenanceLogs";
import type { MaintenanceLog } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

const TYPE_BADGE: Record<string, string> = {
  preventive: "bg-emerald-100 text-emerald-800",
  corrective: "bg-amber-100 text-amber-800",
  inspection: "bg-blue-100 text-blue-800",
  repair: "bg-red-100 text-red-800",
};

const LOG_TYPE_OPTIONS = [
  { label: "Preventive", value: "preventive" },
  { label: "Corrective", value: "corrective" },
  { label: "Inspection", value: "inspection" },
  { label: "Repair", value: "repair" },
];

const filterFields: FilterField[] = [
  { key: "type", label: "Type", type: "select", options: LOG_TYPE_OPTIONS },
  { key: "from", label: "From", type: "date" },
  { key: "to", label: "To", type: "date" },
];

function buildColumns(
  onEdit: (log: MaintenanceLog) => void,
  onDelete: (log: MaintenanceLog) => void,
  canWrite: boolean
): DataTableColumn<MaintenanceLog>[] {
  const cols: DataTableColumn<MaintenanceLog>[] = [
    {
      key: "type",
      label: "Type",
      className: "w-32",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[row.type] ?? "bg-slate-100 text-slate-700"}`}>
          {row.type}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      className: "min-w-56",
      render: (row) => <span className="line-clamp-2">{row.description}</span>,
    },
    {
      key: "performed_by_user",
      label: "Performed by",
      className: "w-40",
      render: (row) => row.performed_by_user?.name ?? `#${row.performed_by}`,
    },
    {
      key: "performed_at",
      label: "Date",
      className: "w-36",
      render: (row) => formatDateOrDash(row.performed_at),
    },
    {
      key: "hours_spent",
      label: "Hours",
      className: "w-20",
      render: (row) => (row.hours_spent != null ? `${row.hours_spent}h` : "—"),
    },
    {
      key: "cost",
      label: "Cost",
      className: "w-24",
      render: (row) => (row.cost != null ? `$${Number(row.cost).toFixed(2)}` : "—"),
    },
  ];

  if (canWrite) {
    cols.push({
      key: "actions" as keyof MaintenanceLog,
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

type AssetMaintenanceLogSectionProps = {
  assetId: number;
  canWrite: boolean;
};

export default function AssetMaintenanceLogSection({ assetId, canWrite }: AssetMaintenanceLogSectionProps) {
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
    editingLog,
    mutating,
    mutateError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    deleteLog,
  } = useAssetMaintenanceLogs(assetId);

  function handleDelete(log: MaintenanceLog) {
    if (window.confirm(`Delete maintenance log "${log.type}" from ${log.performed_at}?`)) {
      void deleteLog(log.id);
    }
  }

  const columns = buildColumns(openEditForm, handleDelete, canWrite);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-800">Maintenance History</h3>
        {canWrite && (
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-sm bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            + Log maintenance
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
        emptyText="No maintenance logs found."
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

      <MaintenanceLogForm
        key={editingLog?.id ?? "create"}
        isOpen={formOpen}
        editing={editingLog}
        loading={mutating}
        error={mutateError}
        onCloseAction={closeForm}
        onSubmitAction={submitForm}
      />
    </div>
  );
}

