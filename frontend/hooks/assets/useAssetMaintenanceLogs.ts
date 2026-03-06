"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAssetMaintenanceLog,
  deleteAssetMaintenanceLog,
  listAssetMaintenanceLogs,
  updateAssetMaintenanceLog,
} from "@/lib/api/assets";
import type {
  CreateMaintenanceLogPayload,
  MaintenanceLog,
  MaintenanceLogQuery,
  Pagination,
  UpdateMaintenanceLogPayload,
} from "@/lib/types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

export function useAssetMaintenanceLogs(assetId: number) {
  const [items, setItems] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MaintenanceLogQuery>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listAssetMaintenanceLogs(assetId, {
        ...filters,
        page,
        per_page: perPage,
      });
      setItems(response.data);
      setPagination(
        response.pagination ?? {
          total: response.data.length,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (e) {
      setError(getErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [assetId, filters, page, perPage]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const openCreateForm = useCallback(() => {
    setEditingLog(null);
    setMutateError(null);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((log: MaintenanceLog) => {
    setEditingLog(log);
    setMutateError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (mutating) return;
    setFormOpen(false);
    setEditingLog(null);
    setMutateError(null);
  }, [mutating]);

  const submitForm = useCallback(
    async (payload: CreateMaintenanceLogPayload) => {
      setMutating(true);
      setMutateError(null);
      const previousItems = items;

      try {
        if (editingLog) {
          setItems((prev) =>
            prev.map((item) => (item.id === editingLog.id ? { ...item, ...payload } : item))
          );
          await updateAssetMaintenanceLog(assetId, editingLog.id, payload as UpdateMaintenanceLogPayload);
        } else {
          const optimisticId = -Date.now();
          setItems((prev) => [
            {
              id: optimisticId,
              asset_id: assetId,
              performed_by: 0,
              type: payload.type,
              description: payload.description,
              performed_at: payload.performed_at ?? new Date().toISOString(),
              hours_spent: payload.hours_spent ?? null,
              cost: payload.cost ?? null,
              notes: payload.notes ?? null,
            },
            ...prev,
          ]);
          await createAssetMaintenanceLog(assetId, payload);
        }
        setFormOpen(false);
        setEditingLog(null);
        await fetchLogs();
      } catch (e) {
        setItems(previousItems);
        setMutateError(getErrorMessage(e));
        throw e;
      } finally {
        setMutating(false);
      }
    },
    [assetId, editingLog, fetchLogs, items]
  );

  const deleteLog = useCallback(
    async (logId: number) => {
      setMutating(true);
      const previousItems = items;
      setItems((prev) => prev.filter((item) => item.id !== logId));

      try {
        await deleteAssetMaintenanceLog(assetId, logId);
        await fetchLogs();
      } catch (e) {
        setItems(previousItems);
        setError(getErrorMessage(e));
      } finally {
        setMutating(false);
      }
    },
    [assetId, fetchLogs, items]
  );

  const handleFilterChange = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters as MaintenanceLogQuery);
    setPage(1);
  }, []);

  return {
    items,
    loading,
    error,
    pagination,
    page,
    perPage,
    setPage,
    setPerPage,
    handleFilterChange,
    formOpen,
    editingLog,
    mutating,
    mutateError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    deleteLog,
    refresh: fetchLogs,
  };
}

