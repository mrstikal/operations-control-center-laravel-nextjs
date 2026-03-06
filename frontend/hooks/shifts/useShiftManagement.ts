"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { createShift, deleteShift, listShifts, type Shift, updateShift } from "@/lib/api/shifts";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import type { Me } from "@/lib/types";

type ShiftFormState = {
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  description: string;
  is_active: boolean;
};

const INITIAL_FORM: ShiftFormState = {
  name: "",
  start_time: "",
  end_time: "",
  days_of_week: [],
  description: "",
  is_active: true,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useShiftManagement() {
  const router = useRouter();
  const { successAction, errorAction } = useToast();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canManageShifts, setCanManageShifts] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [formData, setFormData] = useState<ShiftFormState>(INITIAL_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { isReadOnly } = useTenantReadOnly(me);

  const loadPermissionsAction = useCallback(async () => {
    try {
      const response = await getMe();
      setMe(response.data);
      const highestRoleLevel = Math.max(...(response.data.roles ?? []).map((role) => role.level), 0);
      setCanManageShifts(highestRoleLevel >= 3);
    } catch (error) {
      console.error("Failed to load shift permissions:", error);
      setCanManageShifts(false);
    }
  }, []);

  const loadShiftsAction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listShifts();
      setShifts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      setShifts([]);
      errorAction(getErrorMessage(error, "Failed to load shifts"));
    } finally {
      setLoading(false);
    }
  }, [errorAction]);

  useEffect(() => {
    void loadShiftsAction();
    void loadPermissionsAction();
  }, [loadPermissionsAction, loadShiftsAction]);

  const sortedShifts = useMemo(
    () => [...shifts].sort((left, right) => left.name.localeCompare(right.name)),
    [shifts]
  );

  const openCreateModalAction = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    setEditingShift(null);
    setFormData(INITIAL_FORM);
    setModalOpen(true);
  }, [isReadOnly]);

  const openEditModalAction = useCallback(
    (shift: Shift) => {
      if (isReadOnly) {
        return;
      }

      setEditingShift(shift);
      setFormData({
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        days_of_week: shift.days_of_week,
        description: shift.description || "",
        is_active: shift.is_active,
      });
      setModalOpen(true);
    },
    [isReadOnly]
  );

  const closeModalAction = useCallback(() => {
    if (submitting) {
      return;
    }

    setModalOpen(false);
  }, [submitting]);

  const updateFormFieldAction = useCallback(
    (patch: Partial<ShiftFormState>) => {
      setFormData((previous) => ({ ...previous, ...patch }));
    },
    []
  );

  const toggleDayAction = useCallback((day: number) => {
    setFormData((previous) => ({
      ...previous,
      days_of_week: previous.days_of_week.includes(day)
        ? previous.days_of_week.filter((value) => value !== day)
        : [...previous.days_of_week, day].sort(),
    }));
  }, []);

  const submitShiftAction = useCallback(async () => {
    if (isReadOnly) {
      return;
    }

    try {
      setSubmitting(true);

      if (editingShift) {
        await updateShift(editingShift.id, formData);
        successAction("Shift updated successfully");
      } else {
        await createShift(formData);
        successAction("Shift created successfully");
      }

      await loadShiftsAction();
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to save shift:", error);
      errorAction(getErrorMessage(error, "Failed to save shift"));
    } finally {
      setSubmitting(false);
    }
  }, [editingShift, errorAction, formData, isReadOnly, loadShiftsAction, successAction]);

  const requestDeleteAction = useCallback(
    (shiftId: number) => {
      if (isReadOnly) {
        return;
      }

      setPendingDeleteId(shiftId);
    },
    [isReadOnly]
  );

  const cancelDeleteAction = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const confirmDeleteAction = useCallback(async () => {
    if (!pendingDeleteId) {
      return;
    }

    try {
      await deleteShift(pendingDeleteId);
      successAction("Shift deleted successfully");
      await loadShiftsAction();
      setPendingDeleteId(null);
    } catch (error) {
      console.error("Failed to delete shift:", error);
      errorAction(getErrorMessage(error, "Failed to delete shift"));
    }
  }, [errorAction, loadShiftsAction, pendingDeleteId, successAction]);

  const openShiftDetailAction = useCallback(
    (shift: Shift) => {
      router.push(`/shifts/${shift.id}`);
    },
    [router]
  );

  return {
    loading,
    sortedShifts,
    modalOpen,
    editingShift,
    submitting,
    canManageShifts,
    isReadOnly,
    formData,
    pendingDeleteId,
    openCreateModalAction,
    openEditModalAction,
    closeModalAction,
    updateFormFieldAction,
    toggleDayAction,
    submitShiftAction,
    requestDeleteAction,
    cancelDeleteAction,
    confirmDeleteAction,
    openShiftDetailAction,
  };
}

