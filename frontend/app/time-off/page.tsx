"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import ModalShell from "@/components/common/ModalShell";
import { type TimeOffRequest } from "@/lib/api/timeOff";
import { formatDate, formatDateRange } from "@/lib/formatters/date";
import { TIME_OFF_STATUS_COLORS } from "@/lib/hr-constants";
import { useTimeOffManagement } from "@/hooks/timeOff/useTimeOffManagement";
import { UI_MESSAGES } from "@/lib/ui-messages";
import {
  getRequestEmployeeDepartment,
  getRequestEmployeeEmail,
  getRequestEmployeeName,
  getRequestEmployeePosition,
} from "@/lib/hr-normalizers";

export default function TimeOffPage() {
  const {
    requests,
    loading,
    metadata,
    sort,
    page,
    perPage,
    pagination,
    decisionModal,
    approvalNote,
    submitting,
    isReadOnly,
    setPage,
    setPerPage,
    setApprovalNote,
    handleFilterChangeAction,
    handleSortChangeAction,
    openDecisionModalAction,
    closeDecisionModalAction,
    submitDecisionAction,
    canDecideRequest,
    viewRequestAction,
    goToCreateRequestAction,
  } = useTimeOffManagement();

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: (metadata?.time_off_statuses ?? []).concat([{ label: "Archived", value: "archived" }]),
      },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: metadata?.time_off_types || [],
      },
      {
        key: "from_date",
        label: "From Date",
        type: "date",
      },
      {
        key: "to_date",
        label: "To Date",
        type: "date",
      },
    ],
    [metadata?.time_off_statuses, metadata?.time_off_types]
  );

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const columns = useMemo<DataTableColumn<TimeOffRequest>[]>(
    () => [
      {
        key: "employee",
        label: "Employee",
        render: (request) => (
          <div>
            <div className="font-medium text-slate-900">{getRequestEmployeeName(request)}</div>
            <div className="text-xs text-slate-500">
              {getRequestEmployeePosition(request)} · {getRequestEmployeeEmail(request)}
            </div>
          </div>
        ),
      },
      {
        key: "department",
        label: "Department",
        render: (request) => getRequestEmployeeDepartment(request),
      },
      {
        key: "type",
        label: "Type",
        render: (request) => {
          const label = request.type.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
          return <span className="text-slate-700">{label}</span>;
        },
      },
      {
        key: "period",
        label: "Period",
        render: (request) => <div className="text-sm">{formatDateRange(request.start_date, request.end_date)}</div>,
      },
      {
        key: "days",
        label: "Days",
        render: (request) => `${calculateDays(request.start_date, request.end_date)} days`,
      },
      {
        key: "status",
        label: "Status",
        render: (request) => {
          const colorClass = TIME_OFF_STATUS_COLORS[request.status] || "bg-gray-100 text-gray-800";
          return (
            <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${colorClass}`}>
              {request.status.toUpperCase()}
            </span>
          );
        },
      },
      {
        key: "requested_at",
        label: "Requested",
        sortable: true,
        render: (request) => formatDate(request.requested_at, "short"),
      },
    ],
    []
  );

  const actions = useMemo<DataTableAction<TimeOffRequest>[]>(
    () => [
      {
        label: "View",
        onClick: viewRequestAction,
      },
      {
        label: "Approve",
        onClick: (request) => openDecisionModalAction(request, "approve"),
        variant: "default",
        isVisible: (request) => canDecideRequest(request),
        isDisabled: () => isReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
      {
        label: "Reject",
        onClick: (request) => openDecisionModalAction(request, "reject"),
        variant: "danger",
        isVisible: (request) => canDecideRequest(request),
        isDisabled: () => isReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
    ],
    [canDecideRequest, isReadOnly, openDecisionModalAction, viewRequestAction]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Time-Off Requests</h1>
          <p className="text-slate-600">Manage employee time-off requests</p>
        </div>
        <button
          type="button"
          onClick={goToCreateRequestAction}
          disabled={isReadOnly}
          title={isReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + New Request
        </button>
      </div>

      {/* Filters */}
      <FilterBar fields={filterFields} onChangeAction={handleFilterChangeAction} />

      {/* Table */}
      <DataTable
        data={requests}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No time-off requests found"
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={handleSortChangeAction}
      />

      <PaginationComponent
        pagination={pagination}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChangeAction={setPage}
        onPerPageChangeAction={setPerPage}
      />

      {/* Decision Modal */}
      <ModalShell
        isOpen={decisionModal.open && !isReadOnly}
        onCloseAction={closeDecisionModalAction}
        title={`${decisionModal.action === "approve" ? "Approve" : "Reject"} Time-Off Request`}
        loading={submitting}
      >
        {decisionModal.request && (
          <div className="space-y-4">
            <div className="rounded-sm bg-slate-50 p-4 space-y-2 text-sm">
              <p>
                <strong>Employee:</strong> {getRequestEmployeeName(decisionModal.request)}
              </p>
              <p>
                <strong>Period:</strong> {formatDate(decisionModal.request.start_date)} -{" "}
                {formatDate(decisionModal.request.end_date)} (
                {calculateDays(decisionModal.request.start_date, decisionModal.request.end_date)}{" "}
                days)
              </p>
              <p>
                <strong>Type:</strong>{" "}
                {decisionModal.request.type
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
              {decisionModal.request.reason && (
                <p>
                  <strong>Reason:</strong> {decisionModal.request.reason}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Note (optional)
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                disabled={isReadOnly}
                rows={3}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add a note..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDecisionModalAction}
                disabled={submitting || isReadOnly}
                className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitDecisionAction();
                }}
                disabled={submitting || isReadOnly}
                className={`rounded-sm px-4 py-2 text-white disabled:opacity-50 ${
                  decisionModal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting
                  ? "Processing..."
                  : decisionModal.action === "approve"
                    ? "Approve"
                    : "Reject"}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
