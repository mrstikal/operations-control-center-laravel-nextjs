"use client";

import BusinessMetricsSection from "@/components/dashboard/BusinessMetricsSection";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import MonitoringAlertsSection from "@/components/dashboard/MonitoringAlertsSection";
import OperationalMetricsSection from "@/components/dashboard/OperationalMetricsSection";
import ReadModelsPanel from "@/components/dashboard/ReadModelsPanel";
import RecentActivitySection from "@/components/dashboard/RecentActivitySection";
import RecentContractsTable from "@/components/dashboard/RecentContractsTable";
import RecentIncidentsTable from "@/components/dashboard/RecentIncidentsTable";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { canSeeBusinessMetrics, canSeeOperationalMetrics } from "@/lib/roles";

export default function DashboardPage() {
  const {
    archiveStatus,
    contracts,
    error,
    feed,
    handleArchiveStatusChange,
    handleProjectionActiveFilterChange,
    handleProjectionNameFilterChange,
    handleSnapshotAggregateFilterChange,
    handleTenantFilterChange,
    incidents,
    isSuperadminUser,
    kpis,
    loading,
    me,
    monitoring,
    projectionActiveFilter,
    projectionNameFilter,
    projectionsPage,
    readModels,
    readModelsError,
    setProjectionsPage,
    setSnapshotsPage,
    snapshotAggregateFilter,
    snapshotsPage,
    tenantFilter,
    tenantOptions,
    tenantsLoading,
    totalProjectionPages,
    totalSnapshotPages,
  } = useDashboardData();

  return (
    <main className="main-container grid">
      <DashboardHeader
        archiveStatus={archiveStatus}
        isSuperadminUser={isSuperadminUser}
        onArchiveStatusChangeAction={handleArchiveStatusChange}
        onTenantFilterChangeAction={handleTenantFilterChange}
        tenantFilter={tenantFilter}
        tenantOptions={tenantOptions}
        tenantsLoading={tenantsLoading}
      />

      {loading && <DashboardSkeleton />}
      {error && <div className="card text-red-400">{error}</div>}

      {!loading && !error && (
        <>
          {me && canSeeOperationalMetrics(me.roles) && <OperationalMetricsSection kpis={kpis} />}

          {me && canSeeBusinessMetrics(me.roles) && <BusinessMetricsSection kpis={kpis} />}

          <MonitoringAlertsSection monitoring={monitoring ?? null} />

          <RecentActivitySection events={feed} loading={loading} />

          {me && canSeeOperationalMetrics(me.roles) && (
            <section className="mt-12">
              <RecentContractsTable contracts={contracts} />
              <RecentIncidentsTable incidents={incidents} />
            </section>
          )}

          <ReadModelsPanel
            onProjectionActiveFilterChangeAction={handleProjectionActiveFilterChange}
            onProjectionNameFilterChangeAction={handleProjectionNameFilterChange}
            onProjectionsPageChangeAction={setProjectionsPage}
            onSnapshotAggregateFilterChangeAction={handleSnapshotAggregateFilterChange}
            onSnapshotsPageChangeAction={setSnapshotsPage}
            projectionActiveFilter={projectionActiveFilter}
            projectionNameFilter={projectionNameFilter}
            projectionsPage={projectionsPage}
            readModels={readModels}
            readModelsError={readModelsError}
            snapshotAggregateFilter={snapshotAggregateFilter}
            snapshotsPage={snapshotsPage}
            totalProjectionPages={totalProjectionPages}
            totalSnapshotPages={totalSnapshotPages}
          />
        </>
      )}
    </main>
  );
}
