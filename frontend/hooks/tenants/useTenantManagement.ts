"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api";
import {
  archiveTenant,
  archiveTenantWithTransfer,
  createTenant,
  getTenantUsersForTransfer,
  listTenantsForManagement,
  restoreTenant,
  updateTenant,
  type Tenant,
  type TenantTransferUser,
} from "@/lib/api/tenants";
import { useToast } from "@/lib/hooks/useToast";
import { isSuperadmin as hasSuperadminRole } from "@/lib/roles";
import type { Pagination } from "@/lib/types";

export type TenantStatusFilter = "" | "active" | "suspended" | "inactive" | "archived";

export type TenantFormState = {
  name: string;
  description: string;
  status: "active" | "suspended" | "inactive";
};

const initialFormState: TenantFormState = {
  name: "",
  description: "",
  status: "active",
};

const initialPagination: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function parseSort(sort: string): {
  sortBy: "name" | "status" | "created_at";
  sortOrder: "asc" | "desc";
} {
  const [sortByRaw, sortOrderRaw] = sort.split(":");
  const sortBy = sortByRaw === "status" || sortByRaw === "created_at" ? sortByRaw : "name";
  const sortOrder = sortOrderRaw === "desc" ? "desc" : "asc";

  return { sortBy, sortOrder };
}

export function useTenantManagement() {
  const { errorAction, successAction } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [transferLoading] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    status: "",
  });
  const [sort, setSort] = useState("name:asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantFormState>(initialFormState);
  const [tenantToArchive, setTenantToArchive] = useState<Tenant | null>(null);
  const [transferTenant, setTransferTenant] = useState<Tenant | null>(null);
  const [transferUsers, setTransferUsers] = useState<TenantTransferUser[]>([]);
  const [transferTargets, setTransferTargets] = useState<Tenant[]>([]);
  const [selectedTargetTenantId, setSelectedTargetTenantId] = useState<number | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const search = useMemo(() => (filters.search ?? "").trim(), [filters.search]);
  const statusFilter = useMemo(
    () => (filters.status ?? "") as TenantStatusFilter,
    [filters.status]
  );

  const loadAccess = useCallback(async () => {
    try {
      const res = await getMe();
      setIsSuperadmin(hasSuperadminRole(res.data.roles));
    } catch (error) {
      console.error("Failed to load user roles:", error);
      setIsSuperadmin(false);
    } finally {
      setAccessResolved(true);
    }
  }, []);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const { sortBy, sortOrder } = parseSort(sort);
      const res = await listTenantsForManagement({
        search: search || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        per_page: perPage,
      });

      setTenants(Array.isArray(res.data) ? res.data : []);
      setPagination(
        res.pagination ?? {
          total: Array.isArray(res.data) ? res.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (error) {
      console.error("Failed to load tenants:", error);
      errorAction(error instanceof Error ? error.message : "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }, [errorAction, page, perPage, search, sort, statusFilter]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    void loadTenants();
  }, [isSuperadmin, loadTenants]);

  const handleFilterChange = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditing(null);
    setForm(initialFormState);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((tenant: Tenant) => {
    setEditing(tenant);
    setForm({
      name: tenant.name,
      description: tenant.description || "",
      status: tenant.status || "active",
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) {
      return;
    }

    setModalOpen(false);
  }, [saving]);

  const updateFormValue = useCallback((patch: Partial<TenantFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveTenant = useCallback(async () => {
    if (!form.name.trim()) {
      errorAction("Name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      };

      if (editing) {
        await updateTenant(editing.id, payload);
        successAction("Tenant updated successfully.");
      } else {
        await createTenant(payload);
        successAction("Tenant created successfully.");
      }

      setModalOpen(false);
      await loadTenants();
    } catch (error) {
      console.error("Failed to save tenant:", error);
      errorAction(error instanceof Error ? error.message : "Failed to save tenant.");
    } finally {
      setSaving(false);
    }
  }, [editing, errorAction, form.description, form.name, form.status, loadTenants, successAction]);

  const requestArchive = useCallback((tenant: Tenant) => {
    setTenantToArchive(tenant);
  }, []);

  const closeArchiveConfirm = useCallback(() => {
    if (archiveLoading) {
      return;
    }

    setTenantToArchive(null);
  }, [archiveLoading]);

  const confirmArchive = useCallback(async () => {
    if (!tenantToArchive) {
      return;
    }

    try {
      setArchiveLoading(true);

      // Pre-check: load users first to avoid hitting DELETE with a 409.
      // Browser always logs 4xx network errors to the console, so we avoid
      // the request entirely when the tenant still has users.
      const transferData = await getTenantUsersForTransfer(tenantToArchive.id);

      if (transferData.data.users_count > 0) {
        // Tenant has users — open transfer modal with data already loaded.
        setTransferTenant(tenantToArchive);
        setTransferUsers(Array.isArray(transferData.data.users) ? transferData.data.users : []);
        setTransferTargets(
          (Array.isArray(transferData.data.available_tenants)
            ? transferData.data.available_tenants
            : []
          ).filter((t) => !t.deleted_at)
        );
        setSelectedTargetTenantId(null);
        setIsTransferModalOpen(true);
        setTenantToArchive(null);
        return;
      }

      // No users — archive immediately (DELETE will return 200).
      await archiveTenant(tenantToArchive.id);
      await loadTenants();
      successAction(`Tenant "${tenantToArchive.name}" archived.`);
      setTenantToArchive(null);
    } catch (error) {
      console.error("Failed to archive tenant:", error);
      errorAction(error instanceof Error ? error.message : "Failed to archive tenant.");
    } finally {
      setArchiveLoading(false);
    }
  }, [errorAction, loadTenants, successAction, tenantToArchive]);

  const closeTransferModal = useCallback(() => {
    if (transferLoading || transferSubmitting) {
      return;
    }

    setIsTransferModalOpen(false);
    setTransferTenant(null);
    setTransferUsers([]);
    setTransferTargets([]);
    setSelectedTargetTenantId(null);
  }, [transferLoading, transferSubmitting]);

  const confirmTransferAndArchive = useCallback(async () => {
    if (!transferTenant || !selectedTargetTenantId) {
      return;
    }

    try {
      setTransferSubmitting(true);
      await archiveTenantWithTransfer(transferTenant.id, selectedTargetTenantId);
      await loadTenants();
      successAction(`Tenant "${transferTenant.name}" archived and users transferred.`);
      closeTransferModal();
    } catch (error) {
      console.error("Failed to transfer users and archive tenant:", error);
      errorAction(error instanceof Error ? error.message : "Failed to transfer users.");
    } finally {
      setTransferSubmitting(false);
    }
  }, [
    closeTransferModal,
    errorAction,
    loadTenants,
    selectedTargetTenantId,
    successAction,
    transferTenant,
  ]);

  const restoreTenantAction = useCallback(
    async (tenant: Tenant) => {
      try {
        await restoreTenant(tenant.id);
        await loadTenants();
        successAction(`Tenant "${tenant.name}" restored.`);
      } catch (error) {
        console.error("Failed to restore tenant:", error);
        errorAction(error instanceof Error ? error.message : "Failed to restore tenant.");
      }
    },
    [errorAction, loadTenants, successAction]
  );

  return {
    tenants,
    loading,
    saving,
    archiveLoading,
    transferLoading,
    transferSubmitting,
    isSuperadmin,
    accessResolved,
    filters,
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
  };
}
