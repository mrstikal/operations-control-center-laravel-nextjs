"use client";

import { useMemo } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import TenantArchiveTransferModal from "@/components/tenants/TenantArchiveTransferModal";
import TenantFormModal from "@/components/tenants/TenantFormModal";
import TenantStatusBadge from "@/components/tenants/TenantStatusBadge";
import { useTenantManagement } from "@/hooks/tenants/useTenantManagement";
import type { Tenant } from "@/lib/api/tenants";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function TenantsPage() {
  const {
    tenants,
    loading,
    saving,
    archiveLoading,
    transferLoading,
    transferSubmitting,
    isSuperadmin,
    accessResolved,
    sort,
    page,
    perPage,
    pagination,
    modalOpen,
    editing,
    form,
    tenantToArchive,
    transferTenant,
    transferUsers,
    transferTargets,
    selectedTargetTenantId,
    isTransferModalOpen,
    setPage,
    setPerPage,
    setSelectedTargetTenantId,
    handleFilterChange,
    handleSortChange,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormValue,
    saveTenant,
    requestArchive,
    closeArchiveConfirm,
    confirmArchive,
    closeTransferModal,
    confirmTransferAndArchive,
    restoreTenantAction,
  } = useTenantManagement();

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "search",
        label: "Search",
        type: "text",
        placeholder: "Search name or description",
      },
      {
        key: "status",
        label: "State",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Suspended", value: "suspended" },
          { label: "Inactive", value: "inactive" },
          { label: "Archived", value: "archived" },
        ],
      },
    ],
    []
  );

  const columns = useMemo<DataTableColumn<Tenant>[]>(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        className: "whitespace-nowrap",
        render: (tenant) => <span className="font-medium text-slate-900">{tenant.name}</span>,
      },
      {
        key: "description",
        label: "Description",
        render: (tenant) => tenant.description || "-",
      },
      {
        key: "status",
        label: "Tenant state",
        sortable: true,
        className: "whitespace-nowrap",
        render: (tenant) => <TenantStatusBadge tenant={tenant} />,
      },
      {
        key: "created_at",
        label: "Created",
        sortable: true,
        className: "whitespace-nowrap text-slate-600",
        render: (tenant) => formatDateOrDash(tenant.created_at),
      },
    ],
    []
  );

  const actions = useMemo<DataTableAction<Tenant>[]>(
    () => [
      {
        label: "Edit",
        onClick: openEditModal,
        isVisible: (tenant) => !tenant.deleted_at,
      },
      {
        label: "Archive",
        variant: "danger",
        onClick: requestArchive,
        isVisible: (tenant) => !tenant.deleted_at,
      },
      {
        label: "Restore",
        onClick: (tenant) => {
          void restoreTenantAction(tenant);
        },
        isVisible: (tenant) => Boolean(tenant.deleted_at),
      },
    ],
    [openEditModal, requestArchive, restoreTenantAction]
  );

  if (!accessResolved || (isSuperadmin && loading)) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4">Loading tenants...</div>
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Access denied. Tenant management is available only for Superadmin.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          + New Tenant
        </button>
      </div>

      <FilterBar fields={filterFields} onChangeAction={handleFilterChange} />

      <DataTable
        data={tenants}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No tenants found."
        rowKey={(tenant) => tenant.id}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <PaginationComponent
        pagination={pagination}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChangeAction={setPage}
        onPerPageChangeAction={setPerPage}
      />

      <TenantFormModal
        isOpen={modalOpen}
        editing={editing}
        form={form}
        saving={saving}
        onCloseAction={closeModal}
        onSubmitAction={() => {
          void saveTenant();
        }}
        onFormChangeAction={updateFormValue}
      />

      <ConfirmDialog
        isOpen={Boolean(tenantToArchive)}
        title="Archive tenant"
        message={
          tenantToArchive ? `Archive tenant "${tenantToArchive.name}"?` : "Archive this tenant?"
        }
        confirmLabel="Archive"
        tone="danger"
        loading={archiveLoading}
        onCancelAction={closeArchiveConfirm}
        onConfirmAction={() => {
          void confirmArchive();
        }}
      />

      <TenantArchiveTransferModal
        isOpen={isTransferModalOpen}
        tenantName={transferTenant?.name}
        users={transferUsers}
        transferTargets={transferTargets}
        selectedTargetTenantId={selectedTargetTenantId}
        loading={transferLoading}
        submitting={transferSubmitting}
        onCloseAction={closeTransferModal}
        onTargetChangeAction={setSelectedTargetTenantId}
        onSubmitAction={() => {
          void confirmTransferAndArchive();
        }}
      />
    </div>
  );
}
