"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { listAssetCategories, type AssetCategory } from "@/lib/api/assetCategories";
import { getAssetById, listAssets, updateAsset } from "@/lib/api/assets";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { authEvents, getTenantContext } from "@/lib/auth";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canCreate, canEdit } from "@/lib/permissions";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import type { Asset, Me, Pagination, Permission } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useAssetManagement() {
  const router = useRouter();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [canFilterByTenant, setCanFilterByTenant] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterInitialValues, setFilterInitialValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

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

  const canCreateAssets = useMemo(() => canCreate(permissions, "assets"), [permissions]);
  const canEditAssets = useMemo(() => canEdit(permissions, "assets"), [permissions]);

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

  const loadAssetsAction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listAssets(
        {
          ...filters,
          page,
          per_page: perPage,
          sort,
          ...(isAllTenantsSelected ? { all_tenants: true } : {}),
        },
        { skipTenantHeader: isAllTenantsSelected }
      );

      setAssets(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load assets"));
      setAssets([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: page,
        last_page: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, isAllTenantsSelected, page, perPage, sort]);

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
    async function loadCategoriesAction() {
      try {
        const response = await listAssetCategories();
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (loadError) {
        console.error("Failed to fetch categories:", loadError);
      }
    }

    void loadCategoriesAction();
  }, []);

  useEffect(() => {
    void loadAssetsAction();
  }, [loadAssetsAction]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChangeAction = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const createAssetAction = useCallback(() => {
    if (isPageReadOnly) {
      return;
    }

    router.push("/assets/create");
  }, [isPageReadOnly, router]);

  const viewAssetDetailAction = useCallback(
    (asset: Asset) => {
      router.push(`/assets/${asset.id}`);
    },
    [router]
  );

  const openEditAssetAction = useCallback(
    async (asset: Asset) => {
      if (isPageReadOnly || Boolean(asset.tenant?.deleted_at)) {
        return;
      }

      setError(null);
      setEditModalLoading(true);
      setError(null);

      try {
        const response = await getAssetById(asset.id);
        setEditingAsset(response.data);
        setEditModalOpen(true);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Failed to load asset for editing"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [isPageReadOnly]
  );

  const closeEditAssetAction = useCallback(() => {
    setEditModalOpen(false);
  }, []);

  const submitEditAssetAction = useCallback(
    async (values: Record<string, string>) => {
      if (!editingAsset) {
        return;
      }

      if (isPageReadOnly) {
        setError("Tenant is archived, this page is read-only.");
        return;
      }

      setEditModalLoading(true);

      try {
        let reason: string | undefined;
        if (values.status && values.status !== editingAsset.status) {
          const enteredReason = values.reason?.trim();
          if (!enteredReason) {
            setError("Status change reason is required.");
            return;
          }
          reason = enteredReason;
        }

        const payload: Partial<Asset> & { reason?: string } = {
          name: values.name,
          asset_tag: values.asset_tag,
          category_id: values.category ? Number(values.category) : undefined,
          status: values.status,
          location: values.location,
          description: values.description,
          reason,
        };

        const response = await updateAsset(editingAsset.id, payload);

        setAssets((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
        setEditModalOpen(false);
        setEditingAsset(null);
      } catch (submitError) {
        setError(getErrorMessage(submitError, "Failed to update asset"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [editingAsset, isPageReadOnly]
  );

  return {
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
  };
}

