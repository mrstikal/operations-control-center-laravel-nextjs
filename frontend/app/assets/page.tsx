"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import ArchivedTenantBanner from "@/components/common/ArchivedTenantBanner";
import PaginationComponent from "@/components/common/Pagination";
import AssetEditModal from "@/components/assets/AssetEditModal";
import { useAssetManagement } from "@/hooks/assets/useAssetManagement";
import type { Tenant } from "@/lib/api/tenants";
import { UI_MESSAGES } from "@/lib/ui-messages";
import type { Asset } from "@/lib/types";

export default function AssetsPage() {
  const {
    assets,
    loading,
    error,
    tenants,
    categories,
    canFilterByTenant,
    canCreateAssets,
    canEditAssets,
    sort,
    page,
    perPage,
    pagination,
    filterInitialValues,
    isPageReadOnly,
    archivedTenantNameForBanner,
    editModalOpen,
    editModalLoading,
    editingAsset,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    handleSortChangeAction,
    createAssetAction,
    viewAssetDetailAction,
    openEditAssetAction,
    closeEditAssetAction,
    submitEditAssetAction,
  } = useAssetManagement();

  const columns = useMemo<DataTableColumn<Asset>[]>(
    () => [
      { key: "asset_tag", label: "Asset Tag" },
      { key: "name", label: "Name", className: "flex-1" },
      ...(canFilterByTenant
        ? [
            {
              key: "tenant" as const,
              label: "Tenant",
              render: (asset: Asset) => {
                if (!asset.tenant) {
                  return "—";
                }

                return (
                  <span className={asset.tenant.deleted_at ? "text-dimmed" : undefined}>
                    {asset.tenant.name}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: "category",
        label: "Category",
        sortable: true,
        render: (asset) => {
          if (!asset.category) return "—";
          if (typeof asset.category === "string") {
            return asset.category;
          }

          return asset.category.name || "—";
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (asset) => {
          const color = asset.deleted_at
            ? "bg-zinc-600"
            : asset.status === "operational"
              ? "bg-green-600"
              : asset.status === "maintenance"
                ? "bg-yellow-600"
                : asset.status === "repair"
                  ? "bg-orange-600"
                  : "bg-slate-600";

          return (
            <span className={`status-badge ${color}`}>
              {asset.deleted_at ? "Deleted" : asset.status}
            </span>
          );
        },
      },
      { key: "location", label: "Location" },
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
          { label: "Operational", value: "operational" },
          { label: "Maintenance", value: "maintenance" },
          { label: "Repair", value: "repair" },
          { label: "Retired", value: "retired" },
          { label: "Disposed", value: "disposed" },
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
        key: "category",
        label: "Category",
        type: "select",
        options: categories.map((category) => ({
          label: category.name,
          value: String(category.id),
        })),
      },
      {
        key: "search",
        label: "Search",
        type: "text",
        placeholder: "Name, tag or description...",
      },
    ],
    [canFilterByTenant, categories, tenants]
  );

  const actions = useMemo<DataTableAction<Asset>[]>(
    () => [
      {
        label: "Details",
        onClick: viewAssetDetailAction,
      },
      ...(canEditAssets
        ? [
            {
              label: "Edit",
              onClick: (asset: Asset) => {
                void openEditAssetAction(asset);
              },
              isVisible: (asset: Asset) => !asset.deleted_at,
              isDisabled: (asset: Asset) =>
                isPageReadOnly || Boolean(asset.tenant?.deleted_at),
              disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
            } as DataTableAction<Asset>,
          ]
        : []),
    ],
    [canEditAssets, isPageReadOnly, openEditAssetAction, viewAssetDetailAction]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assets</h1>
        {canCreateAssets && (
          <button
            type="button"
            onClick={createAssetAction}
            disabled={isPageReadOnly}
            title={isPageReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
            className="rounded-sm bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New Asset
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
        data={assets}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No assets found."
        rowKey={(asset) => asset.id}
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

      <AssetEditModal
        isOpen={editModalOpen && !isPageReadOnly}
        asset={editingAsset}
        categories={categories}
        loading={editModalLoading}
        error={error}
        onCloseAction={closeEditAssetAction}
        onSubmitAction={submitEditAssetAction}
      />
    </div>
  );
}
