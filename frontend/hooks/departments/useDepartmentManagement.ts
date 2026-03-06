"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type Department,
} from "@/lib/api/departments";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useToast } from "@/lib/hooks/useToast";

type MeUser = {
  roles?: Array<{ id: number; name: string }>;
};

type DepartmentDeleteError = {
  message?: string;
  data?: { assigned_employees_count?: number; available_departments?: Department[] };
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useDepartmentManagement() {
  const { confirmAction } = useConfirm();
  const { errorAction, successAction } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState<number | null>(null);
  const [assignedCount, setAssignedCount] = useState(0);

  const loadMeAction = useCallback(async () => {
    try {
      const response = await getMe();
      const me = response.data as MeUser;
      const hasSuperadmin = (me.roles || []).some((role) => role.name === "Superadmin");
      setIsSuperadmin(hasSuperadmin);
    } catch (error) {
      console.error("Failed to load user roles:", error);
      setIsSuperadmin(false);
    }
  }, []);

  const loadDepartmentsAction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listDepartments();
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load departments:", error);
      errorAction(getErrorMessage(error, "Failed to load departments."));
    } finally {
      setLoading(false);
    }
  }, [errorAction]);

  useEffect(() => {
    void loadMeAction();
    void loadDepartmentsAction();
  }, [loadDepartmentsAction, loadMeAction]);

  const openCreateAction = useCallback(() => {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setModalOpen(true);
  }, []);

  const openEditAction = useCallback((department: Department) => {
    setEditing(department);
    setName(department.name);
    setDescription(department.description || "");
    setIsActive(Boolean(department.is_active));
    setModalOpen(true);
  }, []);

  const closeModalAction = useCallback(() => {
    setModalOpen(false);
  }, []);

  const saveDepartmentAction = useCallback(async () => {
    if (!isSuperadmin) {
      errorAction("Only Superadmin can create or update departments.");
      return;
    }

    if (!name.trim()) {
      errorAction("Department name is required.");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await updateDepartment(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await createDepartment({
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      }

      setModalOpen(false);
      await loadDepartmentsAction();
      successAction(editing ? "Department updated successfully." : "Department created successfully.");
    } catch (error) {
      console.error("Failed to save department:", error);
      errorAction(getErrorMessage(error, "Failed to save department."));
    } finally {
      setSaving(false);
    }
  }, [
    description,
    editing,
    errorAction,
    isActive,
    isSuperadmin,
    loadDepartmentsAction,
    name,
    successAction,
  ]);

  const deleteDepartmentAction = useCallback(
    async (department: Department) => {
      if (!isSuperadmin) {
        errorAction("Only Superadmin can delete departments.");
        return;
      }

      const confirmed = await confirmAction({
        title: "Delete department",
        message: `Delete department "${department.name}"?`,
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!confirmed) {
        return;
      }

      try {
        await deleteDepartment(department.id);
        await loadDepartmentsAction();
        successAction("Department deleted successfully.");
      } catch (error: unknown) {
        console.error("Failed to delete department:", error);

        const departmentError = error as DepartmentDeleteError;
        if (departmentError?.message?.includes("Provide target_department_id")) {
          const errorData = departmentError.data || {};
          setDepartmentToDelete(department);
          setAvailableDepartments(errorData.available_departments || []);
          setAssignedCount(errorData.assigned_employees_count || 0);
          setTargetDepartmentId(null);
          setReassignModalOpen(true);
          return;
        }

        errorAction(getErrorMessage(error, "Failed to delete department."));
      }
    },
    [confirmAction, errorAction, isSuperadmin, loadDepartmentsAction, successAction]
  );

  const closeReassignModalAction = useCallback(() => {
    setReassignModalOpen(false);
  }, []);

  const reassignAndDeleteAction = useCallback(async () => {
    if (!departmentToDelete || !targetDepartmentId) {
      errorAction("Please select a target department.");
      return;
    }

    try {
      setSaving(true);
      await deleteDepartment(departmentToDelete.id, targetDepartmentId);
      setReassignModalOpen(false);
      await loadDepartmentsAction();
      successAction("Department deleted and employees reassigned.");
    } catch (error) {
      console.error("Failed to reassign and delete:", error);
      errorAction(getErrorMessage(error, "Failed to reassign employees."));
    } finally {
      setSaving(false);
    }
  }, [departmentToDelete, errorAction, loadDepartmentsAction, successAction, targetDepartmentId]);

  return {
    departments,
    loading,
    isSuperadmin,
    saving,
    modalOpen,
    editing,
    name,
    description,
    isActive,
    reassignModalOpen,
    departmentToDelete,
    availableDepartments,
    targetDepartmentId,
    assignedCount,
    setName,
    setDescription,
    setIsActive,
    setTargetDepartmentId,
    openCreateAction,
    openEditAction,
    closeModalAction,
    saveDepartmentAction,
    deleteDepartmentAction,
    closeReassignModalAction,
    reassignAndDeleteAction,
  };
}

