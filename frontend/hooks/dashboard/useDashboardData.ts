"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchableSelectOption } from "@/components/common/SearchableSelect";
import { authEvents, clearToken, getTenantContext, isTenantContextAll } from "@/lib/auth";
import {
  getContracts,
  getDashboardFeed,
  getDashboardReadModels,
  getDashboardSummary,
  getIncidents,
  type Contract,
  type DashboardEvent,
  type DashboardReadModels,
  type DashboardReadModelsQuery,
  type Incident,
} from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { EMPTY_KPIS, EMPTY_READ_MODELS, READ_MODELS_PAGE_SIZE } from "@/lib/dashboard/constants";
import { mapFeedToUiEvents, mapSummaryToUiKpis } from "@/lib/dashboard/mappers";
import type {
  ArchiveStatus,
  ProjectionActiveFilter,
  TenantFilterValue,
  UiKpis,
} from "@/lib/dashboard/types";
import type { DashboardSummary } from "@/lib/types";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { isSuperadmin } from "@/lib/roles";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import { useDashboardRealtime } from "@/hooks/dashboard/useDashboardRealtime";

const ALL_TENANTS_OPTION: SearchableSelectOption = {
  id: "all",
  value: "all",
  label: "All tenants",
};

export function useDashboardData() {
  const router = useRouter();
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feed, setFeed] = useState<DashboardEvent[]>([]);
  const [readModels, setReadModels] = useState<DashboardReadModels>(EMPTY_READ_MODELS);
  const [error, setError] = useState<string | null>(null);
  const [readModelsError, setReadModelsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<UiKpis>(EMPTY_KPIS);
  const [monitoring, setMonitoring] = useState<NonNullable<DashboardSummary["monitoring"]> | null>(null);
  const [tenantOptions, setTenantOptions] = useState<SearchableSelectOption[]>([
    ALL_TENANTS_OPTION,
  ]);
  const [tenantFilter, setTenantFilter] = useState<TenantFilterValue>(() => {
    if (typeof window === "undefined") return "all";
    if (isTenantContextAll()) return "all";
    const ctx = getTenantContext();
    return ctx ?? "all";
  });
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>("active");
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [projectionNameFilter, setProjectionNameFilter] = useState("");
  const [projectionActiveFilter, setProjectionActiveFilter] =
    useState<ProjectionActiveFilter>("all");
  const [snapshotAggregateFilter, setSnapshotAggregateFilter] = useState("");
  const [projectionsPage, setProjectionsPage] = useState(1);
  const [snapshotsPage, setSnapshotsPage] = useState(1);

  const tenantId = currentUser?.tenant_id ?? null;
  const isSuperadminUser =
    isSuperadmin(currentUser?.roles) ||
    (currentUser?.roles ?? []).some((role) => role.name === "Superadmin");
  const canUseAllTenantsScope = canFilterByTenantContext(currentUser);
  const allTenantsScopeActive = useMemo(
    () => canUseAllTenantsScope && tenantFilter === "all",
    [canUseAllTenantsScope, tenantFilter]
  );
  const selectedTenantId = useMemo(
    () => (tenantFilter === "all" ? undefined : tenantFilter),
    [tenantFilter]
  );
  const realtimeTenantId = useMemo(() => {
    if (allTenantsScopeActive) {
      return null;
    }

    return selectedTenantId ?? tenantId;
  }, [allTenantsScopeActive, selectedTenantId, tenantId]);

  const readModelsQuery = useMemo<DashboardReadModelsQuery>(
    () => ({
      projections_page: projectionsPage,
      snapshots_page: snapshotsPage,
      per_page: READ_MODELS_PAGE_SIZE,
      projection_name: projectionNameFilter || undefined,
      projection_active: projectionActiveFilter,
      snapshot_aggregate_type: snapshotAggregateFilter || undefined,
      tenant_id: selectedTenantId,
      archive_status: archiveStatus,
      ...(allTenantsScopeActive ? { all_tenants: true } : {}),
    }),
    [
      projectionsPage,
      snapshotsPage,
      projectionNameFilter,
      projectionActiveFilter,
      snapshotAggregateFilter,
      selectedTenantId,
      archiveStatus,
      allTenantsScopeActive,
    ]
  );

  const totalProjectionPages = readModels.projections_pagination?.last_page ?? 1;
  const totalSnapshotPages = readModels.snapshots_pagination?.last_page ?? 1;

  useEffect(() => {
    if (projectionsPage > totalProjectionPages) {
      setProjectionsPage(totalProjectionPages);
    }
  }, [projectionsPage, totalProjectionPages]);

  useEffect(() => {
    if (snapshotsPage > totalSnapshotPages) {
      setSnapshotsPage(totalSnapshotPages);
    }
  }, [snapshotsPage, totalSnapshotPages]);

  useEffect(() => {
    if (tenantFilter !== "all" && archiveStatus !== "active") {
      setArchiveStatus("active");
    }
  }, [tenantFilter, archiveStatus]);

  useEffect(() => {
    if (!isSuperadminUser) {
      setTenantOptions([ALL_TENANTS_OPTION]);
      // canUseAllTenantsScope users (Admins) keep their context-based tenantFilter;
      // users without that capability are always in single-tenant mode anyway
      // (allTenantsScopeActive stays false for them regardless of tenantFilter value).
      return;
    }

    let mounted = true;
    setTenantsLoading(true);

    listTenants()
      .then((res) => {
        if (!mounted) return;

        const mapped = (res.data ?? []).map((tenant: Tenant) => ({
          id: tenant.id,
          value: tenant.id,
          label: tenant.name,
        }));

        setTenantOptions([ALL_TENANTS_OPTION, ...mapped]);
      })
      .catch(() => {
        if (!mounted) return;
        setTenantOptions([ALL_TENANTS_OPTION]);
      })
      .finally(() => {
        if (mounted) setTenantsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isSuperadminUser]);

  // Sync tenantFilter when the Header's TenantSwitcher changes tenant context.
  // This covers Admin users who cannot use the DashboardHeader tenant select but
  // CAN select a tenant via the global header (which fires authEvents.tenantChanged).
  useEffect(() => {
    if (!canUseAllTenantsScope) return;

    const handleTenantChanged = () => {
      const isAll = isTenantContextAll();
      const ctx = getTenantContext();
      setTenantFilter(isAll || !ctx ? "all" : ctx);
      setProjectionsPage(1);
      setSnapshotsPage(1);
    };

    window.addEventListener(authEvents.tenantChanged, handleTenantChanged);
    return () => {
      window.removeEventListener(authEvents.tenantChanged, handleTenantChanged);
    };
  }, [canUseAllTenantsScope]);

  useEffect(() => {
    if (currentUserLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        const [summaryRes, feedRes, contractsRes, incidentsRes] = await Promise.all([
          getDashboardSummary(
            {
              tenant_id: selectedTenantId,
              archive_status: archiveStatus,
              ...(allTenantsScopeActive ? { all_tenants: true } : {}),
            },
            { skipTenantHeader: allTenantsScopeActive }
          ),
          getDashboardFeed(
            15,
            {
              tenant_id: selectedTenantId,
              archive_status: archiveStatus,
              ...(allTenantsScopeActive ? { all_tenants: true } : {}),
            },
            { skipTenantHeader: allTenantsScopeActive }
          ),
          getContracts(5, selectedTenantId, allTenantsScopeActive, {
            skipTenantHeader: allTenantsScopeActive,
          }),
          getIncidents(5, selectedTenantId, allTenantsScopeActive, {
            skipTenantHeader: allTenantsScopeActive,
          }),
        ]);
        if (!mounted) return;
        setKpis(mapSummaryToUiKpis(summaryRes.data));
        setMonitoring(summaryRes.data.monitoring ?? null);
        setFeed(mapFeedToUiEvents(feedRes.data?.events));
        setContracts(contractsRes.data ?? []);
        setIncidents(incidentsRes.data ?? []);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.message === "Unauthenticated.") {
          clearToken();
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [
    router,
    selectedTenantId,
    archiveStatus,
    currentUser,
    currentUserLoading,
    allTenantsScopeActive,
  ]);

  const reloadReadModelsOnly = useCallback(async () => {
    try {
      const readModelsRes = await getDashboardReadModels(readModelsQuery, {
        skipTenantHeader: allTenantsScopeActive,
      });
      setReadModels(readModelsRes.data ?? EMPTY_READ_MODELS);
      setReadModelsError(null);
    } catch (err) {
      setReadModelsError(err instanceof Error ? err.message : "Failed to load read models.");
    }
  }, [readModelsQuery, allTenantsScopeActive]);

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;

    async function loadReadModelsOnly() {
      try {
        const readModelsRes = await getDashboardReadModels(readModelsQuery, {
          skipTenantHeader: allTenantsScopeActive,
        });
        if (cancelled) return;
        setReadModels(readModelsRes.data ?? EMPTY_READ_MODELS);
        setReadModelsError(null);
      } catch (err) {
        if (cancelled) return;
        setReadModelsError(err instanceof Error ? err.message : "Failed to load read models.");
      }
    }

    void loadReadModelsOnly();

    return () => {
      cancelled = true;
    };
  }, [tenantId, readModelsQuery, allTenantsScopeActive]);

  const reloadAll = useCallback(async () => {
    try {
      const [summary, feedRes, readModelsRes, contractsRes, incidentsRes] = await Promise.all([
        getDashboardSummary(
          {
            tenant_id: selectedTenantId,
            ...(allTenantsScopeActive ? { all_tenants: true } : {}),
          },
          { skipTenantHeader: allTenantsScopeActive }
        ),
        getDashboardFeed(
          15,
          {
            tenant_id: selectedTenantId,
            ...(allTenantsScopeActive ? { all_tenants: true } : {}),
          },
          { skipTenantHeader: allTenantsScopeActive }
        ),
        getDashboardReadModels(readModelsQuery, { skipTenantHeader: allTenantsScopeActive }),
        getContracts(5, selectedTenantId, allTenantsScopeActive, {
          skipTenantHeader: allTenantsScopeActive,
        }),
        getIncidents(5, selectedTenantId, allTenantsScopeActive, {
          skipTenantHeader: allTenantsScopeActive,
        }),
      ]);
      setKpis(mapSummaryToUiKpis(summary.data));
      setMonitoring(summary.data.monitoring ?? null);
      setFeed(mapFeedToUiEvents(feedRes.data?.events));
      setReadModels(readModelsRes.data ?? EMPTY_READ_MODELS);
      setReadModelsError(null);
      setContracts(contractsRes.data ?? []);
      setIncidents(incidentsRes.data ?? []);
    } catch {
      // Keep current UI state on transient realtime errors.
    }
  }, [readModelsQuery, selectedTenantId, allTenantsScopeActive]);

  useDashboardRealtime({
    tenantId: realtimeTenantId,
    onReloadAllAction: reloadAll,
    onReloadReadModelsAction: reloadReadModelsOnly,
  });

  function handleTenantFilterChange(value: string | number) {
    setTenantFilter(value === "all" ? "all" : Number(value));
    setProjectionsPage(1);
    setSnapshotsPage(1);
  }

  function handleArchiveStatusChange(nextArchiveStatus: ArchiveStatus) {
    setArchiveStatus(nextArchiveStatus);
    setProjectionsPage(1);
    setSnapshotsPage(1);
  }

  function handleProjectionNameFilterChange(value: string) {
    setProjectionNameFilter(value);
    setProjectionsPage(1);
  }

  function handleProjectionActiveFilterChange(value: ProjectionActiveFilter) {
    setProjectionActiveFilter(value);
    setProjectionsPage(1);
  }

  function handleSnapshotAggregateFilterChange(value: string) {
    setSnapshotAggregateFilter(value);
    setSnapshotsPage(1);
  }

  return {
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
    me: currentUser,
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
  };
}
