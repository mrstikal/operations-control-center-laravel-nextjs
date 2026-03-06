"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAssetMaintenanceSchedule,
  deleteAssetMaintenanceSchedule,
  listAssetMaintenanceSchedules,
  updateAssetMaintenanceSchedule,
} from "@/lib/api/assets";
import type {
  CreateMaintenanceSchedulePayload,
  MaintenanceSchedule,
  MaintenanceScheduleQuery,
  Pagination,
  UpdateMaintenanceSchedulePayload,
} from "@/lib/types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

export function useAssetMaintenanceSchedules(assetId: number) {
  const [items, setItems] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MaintenanceScheduleQuery>({});
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
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listAssetMaintenanceSchedules(assetId, {
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
    void fetchSchedules();
  }, [fetchSchedules]);

  const openCreateForm = useCallback(() => {
    setEditingSchedule(null);
    setMutateError(null);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setMutateError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (mutating) return;
    setFormOpen(false);
    setEditingSchedule(null);
    setMutateError(null);
  }, [mutating]);

  const submitForm = useCallback(
    async (payload: CreateMaintenanceSchedulePayload) => {
      setMutating(true);
      setMutateError(null);
      const previousItems = items;

      try {
        if (editingSchedule) {
          setItems((prev) =>
            prev.map((item) => (item.id === editingSchedule.id ? { ...item, ...payload } : item))
          );
          await updateAssetMaintenanceSchedule(
            assetId,
            editingSchedule.id,
            payload as UpdateMaintenanceSchedulePayload
          );
        } else {
          const optimisticId = -Date.now();
          setItems((prev) => [
            {
              id: optimisticId,
              asset_id: assetId,
              frequency: payload.frequency,
              interval_days: payload.interval_days ?? null,
              description: payload.description,
              next_due_date: payload.next_due_date ?? new Date().toISOString(),
              is_active: payload.is_active ?? true,
              due_state: "ok",
              notification_settings: payload.notification_settings ?? null,
            },
            ...prev,
          ]);
          await createAssetMaintenanceSchedule(assetId, payload);
        }
        setFormOpen(false);
        setEditingSchedule(null);
        await fetchSchedules();
      } catch (e) {
        setItems(previousItems);
        setMutateError(getErrorMessage(e));
        throw e;
      } finally {
        setMutating(false);
      }
    },
    [assetId, editingSchedule, fetchSchedules, items]
  );

  const deleteSchedule = useCallback(
    async (scheduleId: number) => {
      setMutating(true);
      const previousItems = items;
      setItems((prev) => prev.filter((item) => item.id !== scheduleId));

      try {
        await deleteAssetMaintenanceSchedule(assetId, scheduleId);
        await fetchSchedules();
      } catch (e) {
        setItems(previousItems);
        setError(getErrorMessage(e));
      } finally {
        setMutating(false);
      }
    },
    [assetId, fetchSchedules, items]
  );

  const handleFilterChange = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters as MaintenanceScheduleQuery);
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
    editingSchedule,
    mutating,
    mutateError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    deleteSchedule,
    refresh: fetchSchedules,
  };
}

