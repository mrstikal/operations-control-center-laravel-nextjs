"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { getIncidentById, listIncidents, updateIncident } from "@/lib/api/incidents";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { authEvents, getTenantContext } from "@/lib/auth";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import {
  buildIncidentDetailPath,
  buildIncidentScopeOptions,
  buildIncidentScopeQuery,
  normalizeIncidentTenantId,
} from "@/lib/incidents/scope";
import { canCreate, canEdit } from "@/lib/permissions";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import type { Incident, Me, Pagination, Permission } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useIncidentManagement() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [canFilterByTenant, setCanFilterByTenant] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterInitialValues, setFilterInitialValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const { isReadOnly } = useTenantReadOnly(me);

  const hasSuperadminRole = useMemo(
    () => (me?.roles ?? []).some((role) => role.name === "Superadmin"),
    [me?.roles]
  );

  const selectedTenantFilterId = useMemo(
    () => (filters.tenant_id ? Number(filters.tenant_id) : null),
    [filters.tenant_id]
  );

  const isAllTenantsSelected = useMemo(
    () => canFilterByTenant && !filters.tenant_id,
    [canFilterByTenant, filters.tenant_id]
  );

  const selectedTenantFromFilter = useMemo(
    () => (selectedTenantFilterId ? tenants.find((tenant) => tenant.id === selectedTenantFilterId) : null),
    [selectedTenantFilterId, tenants]
  );

  const isPageReadOnly = useMemo(() => {
    if (isAllTenantsSelected) {
      return false;
    }

    if (selectedTenantFilterId) {
      return Boolean(selectedTenantFromFilter?.deleted_at);
    }

    return isReadOnly;
  }, [isAllTenantsSelected, isReadOnly, selectedTenantFilterId, selectedTenantFromFilter?.deleted_at]);

  const archivedTenantNameForBanner = useMemo(() => {
    if (isAllTenantsSelected) {
      return null;
    }

    if (selectedTenantFilterId) {
      return selectedTenantFromFilter?.deleted_at ? selectedTenantFromFilter.name : null;
    }

    return isReadOnly ? (me?.tenant?.name ?? `#${me?.tenant_id ?? ""}`) : null;
  }, [
    isAllTenantsSelected,
    isReadOnly,
    me?.tenant?.name,
    me?.tenant_id,
    selectedTenantFilterId,
    selectedTenantFromFilter?.deleted_at,
    selectedTenantFromFilter?.name,
  ]);

  const canCreateIncidents = useMemo(() => canCreate(permissions, "incidents"), [permissions]);
  const canEditIncidents = useMemo(() => canEdit(permissions, "incidents"), [permissions]);

  const getIncidentScopeForReadAction = useCallback(
    (incident: Incident): number | undefined => {
      if (!isAllTenantsSelected) {
        return undefined;
      }

      return normalizeIncidentTenantId(incident.tenant_id ?? incident.tenant?.id);
    },
    [isAllTenantsSelected]
  );

  const syncTenantFilterFromContextAction = useCallback(() => {
    const tenantContext = getTenantContext();
    const initial: Record<string, string> = {};

    if (tenantContext) {
      initial.tenant_id = String(tenantContext);
    }

    setFilterInitialValues(initial);
    setFilters(initial);
    setPage(1);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch((filters.search ?? "").trim());
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  const loadIncidentsAction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listIncidents(
        {
          ...filters,
          ...(debouncedSearch ? { search: debouncedSearch } : { search: undefined }),
          page,
          per_page: perPage,
          sort,
          ...(isAllTenantsSelected ? { all_tenants: true } : {}),
        },
        { skipTenantHeader: isAllTenantsSelected }
      );

      setIncidents(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Failed to load incidents"));
      setIncidents([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: page,
        last_page: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, isAllTenantsSelected, page, perPage, sort]);

  useEffect(() => {
    async function loadUserAction() {
      try {
        const response = await getMe();
        const canTenantFilter = canFilterByTenantContext(response.data);

        setMe(response.data);
        setPermissions(response.data.permissions || []);
        setCanFilterByTenant(canTenantFilter);

        if (canTenantFilter) {
          syncTenantFilterFromContextAction();
        }
      } catch (loadError) {
        console.error("Failed to fetch user:", loadError);
      }
    }

    void loadUserAction();
  }, [syncTenantFilterFromContextAction]);

  useEffect(() => {
    if (!canFilterByTenant) {
      return;
    }

    const handleTenantChanged = () => {
      syncTenantFilterFromContextAction();
    };

    window.addEventListener(authEvents.tenantChanged, handleTenantChanged);

    return () => {
      window.removeEventListener(authEvents.tenantChanged, handleTenantChanged);
    };
  }, [canFilterByTenant, syncTenantFilterFromContextAction]);

  useEffect(() => {
    if (!canFilterByTenant) {
      return;
    }

    async function loadTenantsAction() {
      try {
        const response = await listTenants({ include_archived: hasSuperadminRole });
        setTenants(Array.isArray(response.data) ? response.data : []);
      } catch (loadError) {
        console.error("Failed to fetch tenants:", loadError);
      }
    }

    void loadTenantsAction();
  }, [canFilterByTenant, hasSuperadminRole]);

  useEffect(() => {
    void loadIncidentsAction();
  }, [loadIncidentsAction]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChangeAction = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const createIncidentAction = useCallback(() => {
    if (isPageReadOnly) {
      return;
    }

    router.push("/incidents/create");
  }, [isPageReadOnly, router]);

  const viewIncidentDetailAction = useCallback(
    (incident: Incident) => {
      router.push(buildIncidentDetailPath(incident.id, getIncidentScopeForReadAction(incident)));
    },
    [getIncidentScopeForReadAction, router]
  );

  const openEditIncidentAction = useCallback(
    async (incident: Incident) => {
      if (isPageReadOnly || Boolean(incident.tenant?.deleted_at)) {
        return;
      }

      setEditModalLoading(true);
      setError(null);

      try {
        const scopedTenantId = getIncidentScopeForReadAction(incident);
        const incidentScope = buildIncidentScopeQuery(scopedTenantId);
        const incidentScopeOptions = buildIncidentScopeOptions(scopedTenantId);
        const response = incidentScope
          ? await getIncidentById(incident.id, incidentScope, incidentScopeOptions)
          : await getIncidentById(incident.id);
        setEditingIncident(response.data);
        setEditModalOpen(true);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Failed to load incident for editing"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [getIncidentScopeForReadAction, isPageReadOnly]
  );

  const closeEditModalAction = useCallback(() => {
    setEditModalOpen(false);
  }, []);

  const submitEditIncidentAction = useCallback(
    async (values: Record<string, string>) => {
      if (!editingIncident) {
        return;
      }

      if (isPageReadOnly) {
        setError("Tenant is archived, this page is read-only.");
        return;
      }

      setError(null);
      setEditModalLoading(true);

      try {
        const payload: Partial<Incident> = {
          title: values.title,
          description: values.description,
          category: values.category,
          severity: values.severity,
          priority: values.priority,
          status: values.status,
        };

        const response = await updateIncident(editingIncident.id, payload);

        setIncidents((prev) =>
          prev.map((item) => (item.id === response.data.id ? { ...item, ...response.data } : item))
        );
        setEditingIncident((prev) => (prev ? { ...prev, ...response.data } : prev));
        setEditModalOpen(false);
      } catch (submitError) {
        setError(getErrorMessage(submitError, "Failed to update incident"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [editingIncident, isPageReadOnly]
  );

  return {
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
  };
}

