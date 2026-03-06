"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEmployee,
  hardDeleteEmployee,
  listEmployees,
  restoreEmployee,
} from "@/lib/api/employees";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { authEvents, getTenantContext } from "@/lib/auth";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useHRMetadata } from "@/lib/hooks/useHRMetadata";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import type { Employee, Me, Pagination } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function getHighestRoleLevel(user: Me | null): number {
  return Math.max(0, ...(user?.roles ?? []).map((role) => role.level));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useEmployeeManagement() {
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { metadata, loading: metadataLoading } = useHRMetadata();
  const { isReadOnly } = useTenantReadOnly(user);
  const { errorAction, successAction } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterInitialValues, setFilterInitialValues] = useState<Record<string, string>>({});
  const [canFilterByTenant, setCanFilterByTenant] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sort, setSort] = useState("id:desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const canManageEmployees = useMemo(() => getHighestRoleLevel(user) >= 3, [user]);
  const canHardDeleteEmployees = useMemo(() => getHighestRoleLevel(user) >= 4, [user]);
  const hasSuperadminRole = useMemo(
    () => (user?.roles ?? []).some((r) => r.name === "Superadmin"),
    [user?.roles]
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
    () =>
      selectedTenantFilterId ? tenants.find((t) => t.id === selectedTenantFilterId) : null,
    [selectedTenantFilterId, tenants]
  );

  const isPageReadOnly = useMemo(() => {
    if (isAllTenantsSelected) return false;
    if (selectedTenantFilterId) return Boolean(selectedTenantFromFilter?.deleted_at);
    return isReadOnly;
  }, [isAllTenantsSelected, isReadOnly, selectedTenantFilterId, selectedTenantFromFilter?.deleted_at]);

  const archivedTenantNameForBanner = useMemo(() => {
    if (isAllTenantsSelected) return null;
    if (selectedTenantFilterId) {
      return selectedTenantFromFilter?.deleted_at ? selectedTenantFromFilter.name : null;
    }
    return isReadOnly ? (user?.tenant?.name ?? (user?.tenant_id ? `#${user.tenant_id}` : null)) : null;
  }, [
    isAllTenantsSelected,
    isReadOnly,
    user?.tenant?.name,
    user?.tenant_id,
    selectedTenantFilterId,
    selectedTenantFromFilter?.deleted_at,
    selectedTenantFromFilter?.name,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch((filters.search ?? "").trim());
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  const effectiveFilters = useMemo(() => {
    const next: Record<string, string> = {};
    if (debouncedSearch) next.search = debouncedSearch;
    if (filters.department) next.department = filters.department;
    if (filters.status) next.status = filters.status;
    if (filters.tenant_id) next.tenant_id = filters.tenant_id;
    return next;
  }, [debouncedSearch, filters.department, filters.status, filters.tenant_id]);

  // Sync tenant filter from header context
  const syncTenantFilterFromContextAction = useCallback(() => {
    const tenantContext = getTenantContext();
    const initial: Record<string, string> = {};
    if (tenantContext) initial.tenant_id = String(tenantContext);
    setFilterInitialValues(initial);
    setFilters(initial);
    setPage(1);
  }, []);

  // Set canFilterByTenant once user is loaded
  useEffect(() => {
    if (currentUserLoading) return;
    const canTenantFilter = canFilterByTenantContext(user);
    setCanFilterByTenant(canTenantFilter);
    if (canTenantFilter) {
      syncTenantFilterFromContextAction();
    }
  }, [currentUserLoading, user, syncTenantFilterFromContextAction]);

  // Listen to tenant changes from the header switcher
  useEffect(() => {
    if (!canFilterByTenant) return;
    const handleTenantChanged = () => { syncTenantFilterFromContextAction(); };
    window.addEventListener(authEvents.tenantChanged, handleTenantChanged);
    return () => { window.removeEventListener(authEvents.tenantChanged, handleTenantChanged); };
  }, [canFilterByTenant, syncTenantFilterFromContextAction]);

  // Load tenant list for the filter dropdown
  useEffect(() => {
    if (!canFilterByTenant) return;
    async function loadTenantsAction() {
      try {
        const response = await listTenants({ include_archived: hasSuperadminRole });
        setTenants(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to fetch tenants:", err);
      }
    }
    void loadTenantsAction();
  }, [canFilterByTenant, hasSuperadminRole]);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const [sortByRaw, sortOrderRaw] = sort.split(":");
      const response = await listEmployees({
        ...effectiveFilters,
        page,
        per_page: perPage,
        sort_by: sortByRaw || "id",
        sort_order: sortOrderRaw === "asc" ? "asc" : "desc",
      });

      setEmployees(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
      setPagination({ total: 0, per_page: perPage, current_page: page, last_page: 1 });
      errorAction(getErrorMessage(error, "Failed to load employees"));
    } finally {
      setEmployeesLoading(false);
    }
  }, [effectiveFilters, errorAction, page, perPage, sort]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const handleFilterChange = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const goToCreateEmployeeAction = useCallback(() => {
    router.push("/employees/create");
  }, [router]);

  const viewEmployeeAction = useCallback(
    (employee: Employee) => { router.push(`/employees/${employee.id}`); },
    [router]
  );

  const editEmployeeAction = useCallback(
    (employee: Employee) => { router.push(`/employees/${employee.id}/edit`); },
    [router]
  );

  const softDeleteEmployeeAction = useCallback(
    async (employee: Employee) => {
      const confirmed = await confirmAction({
        title: "Soft delete employee",
        message: `Soft delete employee #${employee.id}?`,
        confirmLabel: "Soft delete",
        tone: "danger",
      });
      if (!confirmed) return;
      try {
        await deleteEmployee(employee.id);
        await loadEmployees();
        successAction("Employee deleted successfully");
      } catch (error) {
        console.error("Failed to delete employee:", error);
        errorAction(getErrorMessage(error, "Failed to delete employee"));
      }
    },
    [confirmAction, errorAction, loadEmployees, successAction]
  );

  const restoreEmployeeAction = useCallback(
    async (employee: Employee) => {
      const confirmed = await confirmAction({
        title: "Restore employee",
        message: `Restore employee #${employee.id}?`,
        confirmLabel: "Restore",
      });
      if (!confirmed) return;
      try {
        await restoreEmployee(employee.id);
        await loadEmployees();
        successAction("Employee restored successfully");
      } catch (error) {
        console.error("Failed to restore employee:", error);
        errorAction(getErrorMessage(error, "Failed to restore employee"));
      }
    },
    [confirmAction, errorAction, loadEmployees, successAction]
  );

  const hardDeleteEmployeeAction = useCallback(
    async (employee: Employee) => {
      const confirmed = await confirmAction({
        title: "Permanently delete employee",
        message: `Permanently delete employee #${employee.id}? This cannot be undone.`,
        confirmLabel: "Permanently delete",
        tone: "danger",
      });
      if (!confirmed) return;
      try {
        await hardDeleteEmployee(employee.id);
        await loadEmployees();
        successAction("Employee permanently deleted");
      } catch (error) {
        console.error("Failed to permanently delete employee:", error);
        errorAction(getErrorMessage(error, "Failed to permanently delete employee"));
      }
    },
    [confirmAction, errorAction, loadEmployees, successAction]
  );

  return {
    employees,
    loading: employeesLoading || metadataLoading || currentUserLoading,
    metadata,
    sort,
    page,
    perPage,
    pagination,
    canManageEmployees,
    canHardDeleteEmployees,
    isReadOnly,
    isPageReadOnly,
    canFilterByTenant,
    tenants,
    filterInitialValues,
    archivedTenantNameForBanner,
    setPage,
    setPerPage,
    handleFilterChange,
    handleSortChange,
    goToCreateEmployeeAction,
    viewEmployeeAction,
    editEmployeeAction,
    softDeleteEmployeeAction,
    restoreEmployeeAction,
    hardDeleteEmployeeAction,
  };
}
