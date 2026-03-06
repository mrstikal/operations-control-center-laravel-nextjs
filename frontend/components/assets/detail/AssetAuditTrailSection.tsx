"use client";

import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import type { AssetAuditTrailItem, Pagination } from "@/lib/types";
import { formatDateTimeOrDash } from "@/lib/formatters/date";

const AUDIT_ACTION_OPTIONS = [
  { label: "Created", value: "created" },
  { label: "Updated", value: "updated" },
  { label: "Status Changed", value: "status_changed" },
  { label: "Deleted", value: "deleted" },
  { label: "Restored", value: "restored" },
  { label: "Retired", value: "retired" },
  { label: "Disposed", value: "disposed" },
  { label: "Transferred", value: "transferred" },
  { label: "Reassigned", value: "reassigned" },
  { label: "Maintenance Logged", value: "maintenance_logged" },
  { label: "Maintenance Scheduled", value: "maintenance_scheduled" },
];

const auditColumns: DataTableColumn<AssetAuditTrailItem>[] = [
  {
    key: "action",
    label: "Action",
    className: "w-44",
    render: (row) => (
      <span className="status-badge bg-slate-700">
        {row.action}
      </span>
    ),
  },
  {
    key: "user",
    label: "User",
    className: "w-48",
    render: (row) => row.user?.name || `User #${row.user_id}`,
  },
  {
    key: "reason",
    label: "Reason",
    className: "min-w-64",
    render: (row) => row.reason || "—",
  },
  {
    key: "action_at",
    label: "When",
    className: "w-56",
    render: (row) => formatDateTimeOrDash(row.action_at),
  },
];

const auditFilterFields: FilterField[] = [
  {
    key: "action",
    label: "Action",
    type: "select",
    options: AUDIT_ACTION_OPTIONS,
  },
  {
    key: "user_id",
    label: "User ID",
    type: "text",
    placeholder: "e.g. 12",
  },
  {
    key: "date_from",
    label: "From",
    type: "date",
  },
  {
    key: "date_to",
    label: "To",
    type: "date",
  },
];

type AssetAuditTrailSectionProps = {
  items: AssetAuditTrailItem[];
  loading: boolean;
  pagination: Pagination;
  page: number;
  perPage: number;
  onFilterChangeAction: (filters: Record<string, string>) => void;
  onPageChangeAction: (page: number) => void;
  onPerPageChangeAction: (perPage: number) => void;
};

export default function AssetAuditTrailSection({
  items,
  loading,
  pagination,
  page,
  perPage,
  onFilterChangeAction,
  onPageChangeAction,
  onPerPageChangeAction,
}: AssetAuditTrailSectionProps) {
  return (
    <div className="space-y-4">
      <FilterBar fields={auditFilterFields} onChangeAction={onFilterChangeAction} />

      <DataTable
        data={items}
        columns={auditColumns}
        loading={loading}
        emptyText="No audit records found."
        rowKey={(row) => row.id}
      />

      <PaginationComponent
        pagination={pagination}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChangeAction={onPageChangeAction}
        onPerPageChangeAction={onPerPageChangeAction}
      />
    </div>
  );
}
