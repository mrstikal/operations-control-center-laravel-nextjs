"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { createContract, getContractById, listContracts, updateContract } from "@/lib/api/contracts";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { authEvents, getTenantContext } from "@/lib/auth";
import {
  buildContractDetailPath,
  buildContractScopeOptions,
  buildContractScopeQuery,
  normalizeContractTenantId,
} from "@/lib/contracts/scope";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canCreate, canEdit } from "@/lib/permissions";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import type { Contract, Me, Pagination, Permission } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useContractManagement() {
  const router = useRouter();

  const [contracts, setContracts] = useState<Contract[]>([]);
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
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalLoading, setCreateModalLoading] = useState(false);

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

  const canCreateContracts = useMemo(() => canCreate(permissions, "contracts"), [permissions]);
  const canEditContracts = useMemo(() => canEdit(permissions, "contracts"), [permissions]);

  const getContractScopeForReadAction = useCallback(
    (contract: Contract): number | undefined => {
      if (!isAllTenantsSelected) {
        return undefined;
      }

      return normalizeContractTenantId(contract.tenant_id ?? contract.tenant?.id);
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

  const loadContractsAction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listContracts(
        {
          ...filters,
          ...(debouncedSearch ? { search: debouncedSearch } : { search: undefined }),
          sort,
          page,
          per_page: perPage,
          ...(isAllTenantsSelected ? { all_tenants: true } : {}),
        },
        { skipTenantHeader: isAllTenantsSelected }
      );

      setContracts(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load contracts"));
      setContracts([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: 1,
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
    void loadContractsAction();
  }, [loadContractsAction]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChangeAction = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const createContractAction = useCallback(() => {
    if (isPageReadOnly) {
      return;
    }

    setCreateModalOpen(true);
  }, [isPageReadOnly]);

  const closeCreateModalAction = useCallback(() => {
    if (!createModalLoading) {
      setCreateModalOpen(false);
    }
  }, [createModalLoading]);

  const submitCreateContractAction = useCallback(
    async (values: Record<string, string>) => {
      setCreateModalLoading(true);
      setError(null);

      try {
        const payload = {
          ...values,
          ...(canFilterByTenant && values.tenant_id ? { tenant_id: Number(values.tenant_id) } : {}),
          budget: values.budget ? parseFloat(values.budget) : undefined,
          priority: values.priority || "medium",
          status: "draft",
        };

        const response = await createContract(payload);
        setContracts((prev) => [response.data, ...prev]);
        setCreateModalOpen(false);
      } catch (submitError) {
        setError(getErrorMessage(submitError, "Failed to create contract"));
      } finally {
        setCreateModalLoading(false);
      }
    },
    [canFilterByTenant]
  );

  const viewContractDetailAction = useCallback(
    (contract: Contract) => {
      router.push(buildContractDetailPath(contract.id, getContractScopeForReadAction(contract)));
    },
    [getContractScopeForReadAction, router]
  );

  const openEditContractAction = useCallback(
    async (contract: Contract) => {
      if (isPageReadOnly || Boolean(contract.tenant?.deleted_at)) {
        return;
      }

      setEditModalLoading(true);
      setError(null);

      try {
        const scopedTenantId = getContractScopeForReadAction(contract);
        const contractScope = buildContractScopeQuery(scopedTenantId);
        const contractScopeOptions = buildContractScopeOptions(scopedTenantId);
        const response = contractScope
          ? await getContractById(contract.id, contractScope, contractScopeOptions)
          : await getContractById(contract.id);
        setEditingContract(response.data);
        setEditModalOpen(true);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Failed to load contract for editing"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [getContractScopeForReadAction, isPageReadOnly]
  );

  const closeEditModalAction = useCallback(() => {
    if (!editModalLoading) {
      setEditModalOpen(false);
    }
  }, [editModalLoading]);

  const submitEditContractAction = useCallback(
    async (values: Record<string, string>) => {
      if (!editingContract) {
        return;
      }

      setEditModalLoading(true);
      setError(null);

      try {
        const payload: Partial<Contract> = {
          ...values,
          budget: values.budget ? parseFloat(values.budget) : undefined,
          spent: values.spent ? parseFloat(values.spent) : undefined,
        };

        const response = await updateContract(editingContract.id, payload);

        setContracts((prev) =>
          prev.map((item) => (item.id === response.data.id ? { ...item, ...response.data } : item))
        );
        setEditingContract((prev) => (prev ? { ...prev, ...response.data } : prev));
        setEditModalOpen(false);
      } catch (submitError) {
        setError(getErrorMessage(submitError, "Failed to update contract"));
      } finally {
        setEditModalLoading(false);
      }
    },
    [editingContract]
  );

  return {
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
  };
}

