"use client";

import { useParams, useRouter } from "next/navigation";
import AssetLifecycleModal from "@/components/assets/AssetLifecycleModal";
import AssetActions from "@/components/assets/detail/AssetActions";
import AssetAuditTrailSection from "@/components/assets/detail/AssetAuditTrailSection";
import AssetDescriptionCard from "@/components/assets/detail/AssetDescriptionCard";
import AssetDetailsCard from "@/components/assets/detail/AssetDetailsCard";
import AssetHeader from "@/components/assets/detail/AssetHeader";
import AssetMaintenanceCard from "@/components/assets/detail/AssetMaintenanceCard";
import AssetMaintenanceLogSection from "@/components/assets/detail/AssetMaintenanceLogSection";
import AssetMaintenanceScheduleSection from "@/components/assets/detail/AssetMaintenanceScheduleSection";
import AssetOverviewGrid from "@/components/assets/detail/AssetOverviewGrid";
import { useAssetDetail } from "@/hooks/assets/useAssetDetail";
import { hasPermission } from "@/lib/permissions";

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = Number(params.id);

  const {
    asset,
    loading,
    loadError,
    errorMessage,
    actionLoading,
    isReadOnly,
    canEditAssets,
    canDeleteAssets,
    activeTab,
    lifecycleAction,
    lifecycleModalOpen,
    auditItems,
    auditLoading,
    auditPage,
    auditPerPage,
    auditPagination,
    clearErrorAction,
    setActiveTabAction,
    openLifecycleModalAction,
    closeLifecycleModalAction,
    handleLifecycleConfirmAction,
    handleAuditFilterChangeAction,
    setAuditPage,
    setAuditPerPage,
    permissions,
  } = useAssetDetail(assetId);

  const canLogMaintenance =
    !isReadOnly && hasPermission(permissions, "assets", "log_maintenance");
  const canScheduleMaintenance =
    !isReadOnly && hasPermission(permissions, "assets", "schedule_maintenance");

  if (loading) {
    return <div className="p-6">Loading asset...</div>;
  }

  if (loadError && !asset) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {loadError}
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          Asset not found
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "maintenance", label: "Maintenance" },
    { key: "audit", label: "Audit Trail" },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <AssetHeader asset={asset} />
        <AssetActions
          assetId={asset.id}
          status={asset.status}
          isDeleted={Boolean(asset.deleted_at)}
          canEditAssets={canEditAssets}
          canDeleteAssets={canDeleteAssets}
          actionLoading={actionLoading}
          isReadOnly={isReadOnly}
          onEditAction={(id) => router.push(`/assets/${id}/edit`)}
          onLifecycleAction={openLifecycleModalAction}
        />
      </div>

      {errorMessage && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearErrorAction}
              className="rounded-sm border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTabAction(tab.key)}
            className={`rounded-t-sm px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "audit" ? (
        <AssetAuditTrailSection
          items={auditItems}
          loading={auditLoading}
          pagination={auditPagination}
          page={auditPage}
          perPage={auditPerPage}
          onFilterChangeAction={handleAuditFilterChangeAction}
          onPageChangeAction={setAuditPage}
          onPerPageChangeAction={setAuditPerPage}
        />
      ) : activeTab === "maintenance" ? (
        <div className="space-y-8">
          <AssetMaintenanceCard asset={asset} />
          <AssetMaintenanceScheduleSection
            assetId={asset.id}
            canWrite={canScheduleMaintenance}
          />
          <AssetMaintenanceLogSection
            assetId={asset.id}
            canWrite={canLogMaintenance}
          />
        </div>
      ) : (
        <>
          <AssetOverviewGrid asset={asset} />
          <AssetDescriptionCard description={asset.description} />
          <AssetDetailsCard asset={asset} />
        </>
      )}

      {lifecycleAction && (
        <AssetLifecycleModal
          isOpen={lifecycleModalOpen && !isReadOnly}
          action={lifecycleAction}
          assetName={asset.name}
          currentLocation={asset.location}
          currentDepartment={asset.department}
          currentAssignedToId={asset.assigned_to_id}
          currentAssignedToName={asset.assigned_to?.name || null}
          loading={actionLoading}
          onCloseAction={closeLifecycleModalAction}
          onConfirmAction={handleLifecycleConfirmAction}
        />
      )}
    </div>
  );
}
