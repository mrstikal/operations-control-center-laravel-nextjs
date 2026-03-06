"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import ArchivedTenantBanner from "@/components/common/ArchivedTenantBanner";
import PaginationComponent from "@/components/common/Pagination";
import ContractEditModal from "@/components/contracts/ContractEditModal";
import ContractCreateModal from "@/components/contracts/ContractCreateModal";
import { useContractManagement } from "@/hooks/contracts/useContractManagement";
import type { Tenant } from "@/lib/api/tenants";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateOrDash } from "@/lib/formatters/date";
import { UI_MESSAGES } from "@/lib/ui-messages";
import type { Contract } from "@/lib/types";

export default function ContractsPage() {
  const {
    contracts,
    loading,
    error,
    tenants,
    canFilterByTenant,
    canCreateContracts,
    canEditContracts,
    sort,
    page,
    perPage,
    pagination,
    filterInitialValues,
    isPageReadOnly,
    archivedTenantNameForBanner,
    selectedTenantFilterId,
    editModalOpen,
    editModalLoading,
    editingContract,
    createModalOpen,
    createModalLoading,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    handleSortChangeAction,
    createContractAction,
    closeCreateModalAction,
    submitCreateContractAction,
    viewContractDetailAction,
    openEditContractAction,
    closeEditModalAction,
    submitEditContractAction,
  } = useContractManagement();

  const columns = useMemo<DataTableColumn<Contract>[]>(
    () => [
      { key: "contract_number", label: "Number" },
      { key: "title", label: "Title", className: "flex-1" },
      ...(canFilterByTenant
        ? [
            {
              key: "tenant" as const,
              label: "Tenant",
              render: (contract: Contract) => {
                if (!contract.tenant) {
                  return "—";
                }

                return (
                  <span className={contract.tenant.deleted_at ? "text-dimmed" : undefined}>
                    {contract.tenant.name}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: "priority",
        label: "Priority",
        sortable: true,
        render: (contract) => (
          <span
            className={`status-badge ${
              contract.priority === "critical"
                ? "bg-red-600"
                : contract.priority === "high"
                  ? "bg-orange-600"
                  : contract.priority === "medium"
                    ? "bg-yellow-600"
                    : "bg-green-600"
            }`}
          >
            {contract.priority.charAt(0).toUpperCase() + contract.priority.slice(1)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (contract) => (
          <span
            className={`status-badge ${
              contract.deleted_at
                ? "bg-zinc-600"
                : contract.status === "done"
                  ? "bg-green-600"
                  : contract.status === "approved"
                    ? "bg-blue-600"
                    : contract.status === "in_progress"
                      ? "bg-cyan-600"
                      : contract.status === "blocked"
                        ? "bg-red-600"
                        : "bg-slate-600"
            }`}
          >
            {contract.deleted_at
              ? "Deleted"
              : contract.status
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
          </span>
        ),
      },
      {
        key: "incidents_count",
        label: "Incidents",
        className: "text-center",
        sortable: true,
        render: (contract) => String(contract.incidents_count ?? 0),
      },
      {
        key: "due_date",
        label: "Due Date",
        sortable: true,
        render: (contract) => formatDateOrDash(contract.due_date),
      },
      {
        key: "budget",
        label: "Budget",
        className: "text-right",
        sortable: true,
        render: (contract) => formatCurrency(contract.budget),
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
          { label: "Draft", value: "draft" },
          { label: "Approved", value: "approved" },
          { label: "In Progress", value: "in_progress" },
          { label: "Blocked", value: "blocked" },
          { label: "Done", value: "done" },
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
        key: "incidents_presence",
        label: "Incidents",
        type: "select",
        options: [
          { label: "Only with incidents", value: "with" },
          { label: "Only without incidents", value: "without" },
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
      {
        key: "search",
        label: "Search",
        type: "text",
        placeholder: "Title or description...",
      },
    ],
    [canFilterByTenant, tenants]
  );

  const actions = useMemo<DataTableAction<Contract>[]>(
    () => [
      {
        label: "Details",
        onClick: viewContractDetailAction,
      },
      ...(canEditContracts
        ? [
            {
              label: "Edit",
              onClick: (contract: Contract) => {
                void openEditContractAction(contract);
              },
              isVisible: (contract: Contract) => !contract.deleted_at,
              isDisabled: (contract: Contract) =>
                isPageReadOnly || Boolean(contract.tenant?.deleted_at),
              disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
            } as DataTableAction<Contract>,
          ]
        : []),
    ],
    [canEditContracts, isPageReadOnly, openEditContractAction, viewContractDetailAction]
  );

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Contracts</h1>
          {canCreateContracts && (
            <button
              type="button"
              onClick={createContractAction}
              disabled={isPageReadOnly}
              title={isPageReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
              className="rounded-sm bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + New Contract
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
          data={contracts}
          columns={columns}
          actions={actions}
          sort={sort}
          onSortChange={handleSortChangeAction}
          loading={loading}
          emptyText="No contracts found."
          rowKey={(contract) => contract.id}
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

      <ContractEditModal
        isOpen={editModalOpen && canEditContracts}
        contract={editingContract}
        loading={editModalLoading}
        onCloseAction={closeEditModalAction}
        onSubmitAction={submitEditContractAction}
      />

      <ContractCreateModal
        isOpen={createModalOpen && canCreateContracts}
        loading={createModalLoading}
        canSwitchTenant={canFilterByTenant}
        tenants={tenants}
        defaultTenantId={selectedTenantFilterId}
        onCloseAction={closeCreateModalAction}
        onSubmitAction={submitCreateContractAction}
      />
    </>
  );
}
