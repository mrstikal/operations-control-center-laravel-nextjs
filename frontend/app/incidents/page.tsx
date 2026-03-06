"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import ArchivedTenantBanner from "@/components/common/ArchivedTenantBanner";
import PaginationComponent from "@/components/common/Pagination";
import IncidentEditModal from "@/components/incidents/IncidentEditModal";
import { useIncidentManagement } from "@/hooks/incidents/useIncidentManagement";
import type { Tenant } from "@/lib/api/tenants";
import { UI_MESSAGES } from "@/lib/ui-messages";
import type { Incident } from "@/lib/types";

export default function IncidentsPage() {
  const {
    incidents,
    loading,
    error,
    tenants,
    canFilterByTenant,
    canCreateIncidents,
    canEditIncidents,
    sort,
    page,
    perPage,
    pagination,
    filterInitialValues,
    isPageReadOnly,
    archivedTenantNameForBanner,
    editModalOpen,
    editModalLoading,
    editingIncident,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    handleSortChangeAction,
    createIncidentAction,
    viewIncidentDetailAction,
    openEditIncidentAction,
    closeEditModalAction,
    submitEditIncidentAction,
  } = useIncidentManagement();

  const columns = useMemo<DataTableColumn<Incident>[]>(
    () => [
      { key: "incident_number", label: "Number" },
      { key: "title", label: "Title", className: "flex-1" },
      ...(canFilterByTenant
        ? [
            {
              key: "tenant" as const,
              label: "Tenant",
              render: (incident: Incident) => {
                if (!incident.tenant) {
                  return "—";
                }

                return (
                  <span className={incident.tenant.deleted_at ? "text-dimmed" : undefined}>
                    {incident.tenant.name}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: "severity",
        label: "Severity",
        sortable: true,
        render: (incident) => {
          const severity = incident.severity ?? "medium";
          const color =
            severity === "critical"
              ? "bg-red-600"
              : severity === "high"
                ? "bg-orange-600"
                : severity === "medium"
                  ? "bg-yellow-600"
                  : "bg-green-600";

          return (
            <span className={`status-badge ${color}`}>
              {severity}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (incident) => {
          const color = incident.deleted_at
            ? "bg-zinc-600"
            : incident.status === "closed"
              ? "bg-slate-600"
              : incident.status === "resolved"
                ? "bg-green-600"
                : incident.status === "escalated"
                  ? "bg-red-600"
                  : incident.status === "in_progress"
                    ? "bg-cyan-600"
                    : "bg-blue-600";

          return (
            <span className={`status-badge ${color}`}>
              {incident.deleted_at ? "Deleted" : incident.status}
            </span>
          );
        },
      },
    ],
    [canFilterByTenant]
  );

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Open", value: "open" },
          { label: "In Progress", value: "in_progress" },
          { label: "Escalated", value: "escalated" },
          { label: "Resolved", value: "resolved" },
          { label: "Closed", value: "closed" },
          { label: "Deleted", value: "deleted" },
        ],
      },
      ...(canFilterByTenant
        ? [
            {
              key: "tenant_id",
              label: "Tenant",
              type: "select",
              options: tenants.map((tenant: Tenant) => ({
                label: tenant.name,
                value: String(tenant.id),
                muted: Boolean(tenant.deleted_at),
              })),
            } as FilterField,
          ]
        : []),
      {
        key: "severity",
        label: "Severity",
        type: "select",
        options: [
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
          { label: "Critical", value: "critical" },
        ],
      },
      {
        key: "search",
        label: "Search",
        type: "text",
        placeholder: "Title or description...",
      },
    ],
    [canFilterByTenant, tenants]
  );

  const actions = useMemo<DataTableAction<Incident>[]>(
    () => [
      {
        label: "Details",
        onClick: viewIncidentDetailAction,
      },
      ...(canEditIncidents
        ? [
            {
              label: "Edit",
              onClick: (incident: Incident) => {
                void openEditIncidentAction(incident);
              },
              isVisible: (incident: Incident) => !incident.deleted_at,
              isDisabled: (incident: Incident) =>
                isPageReadOnly || Boolean(incident.tenant?.deleted_at),
              disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
            } as DataTableAction<Incident>,
          ]
        : []),
    ],
    [canEditIncidents, isPageReadOnly, openEditIncidentAction, viewIncidentDetailAction]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Incidents</h1>
        {canCreateIncidents && (
          <button
            type="button"
            onClick={createIncidentAction}
            disabled={isPageReadOnly}
            title={isPageReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
            className="rounded-sm bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New Incident
          </button>
        )}
      </div>

      {archivedTenantNameForBanner && (
        <ArchivedTenantBanner tenantName={archivedTenantNameForBanner} />
      )}

      <FilterBar
        fields={filterFields}
        onChangeAction={handleFilterChangeAction}
        initialValues={filterInitialValues}
      />

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <DataTable
        data={incidents}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No incidents found."
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

      <IncidentEditModal
        isOpen={editModalOpen && !isPageReadOnly}
        incident={editingIncident}
        loading={editModalLoading}
        error={error}
        onCloseAction={closeEditModalAction}
        onSubmitAction={submitEditIncidentAction}
      />
    </div>
  );
}
