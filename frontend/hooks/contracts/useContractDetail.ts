"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveContract,
  createContractIncident,
  deleteContract,
  deleteContractIncident,
  getContractById,
  hardDeleteContract,
  restoreContract,
  updateContract,
  updateContractIncident,
} from "@/lib/api/contracts";
import {
  buildContractScopeOptions,
  buildContractScopeQuery,
  normalizeContractTenantId,
} from "@/lib/contracts/scope";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canApprove, canDelete, canEdit } from "@/lib/permissions";
import type { Contract, ContractIncident, Permission } from "@/lib/types";

type ContractScopeQuery = { tenant_id?: number };
type ContractScopeOptions = { skipTenantHeader?: boolean };

const restoreContractScoped = restoreContract as (
  id: number | string,
  query?: ContractScopeQuery,
  options?: ContractScopeOptions
) => ReturnType<typeof restoreContract>;

const hardDeleteContractScoped = hardDeleteContract as (
  id: number | string,
  query?: ContractScopeQuery,
  options?: ContractScopeOptions
) => ReturnType<typeof hardDeleteContract>;

const createContractIncidentScoped = createContractIncident as (
  contractId: number | string,
  payload: {
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    status?: "open" | "in_review" | "resolved" | "closed";
  },
  query?: ContractScopeQuery,
  options?: ContractScopeOptions
) => ReturnType<typeof createContractIncident>;

const updateContractIncidentScoped = updateContractIncident as (
  contractId: number | string,
  incidentId: number | string,
  payload: {
    title?: string;
    description?: string;
    severity?: "low" | "medium" | "high" | "critical";
    status?: "open" | "in_review" | "resolved" | "closed";
  },
  query?: ContractScopeQuery,
  options?: ContractScopeOptions
) => ReturnType<typeof updateContractIncident>;

const deleteContractIncidentScoped = deleteContractIncident as (
  contractId: number | string,
  incidentId: number | string,
  query?: ContractScopeQuery,
  options?: ContractScopeOptions
) => ReturnType<typeof deleteContractIncident>;

export type ContractIncidentFormState = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "closed";
};

const EMPTY_INCIDENT_FORM: ContractIncidentFormState = {
  title: "",
  description: "",
  severity: "medium",
  status: "open",
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type UseContractDetailOptions = {
  tenantId?: number;
};

export function useContractDetail(contractId: string, options?: UseContractDetailOptions) {
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);

  const permissions = useMemo<Permission[]>(() => user?.permissions || [], [user?.permissions]);
  const scopedTenantId = useMemo(() => normalizeContractTenantId(options?.tenantId), [options?.tenantId]);
  const contractReadScope = useMemo(() => buildContractScopeQuery(scopedTenantId), [scopedTenantId]);
  const contractReadOptions = useMemo(() => buildContractScopeOptions(scopedTenantId), [scopedTenantId]);
  const canEditContracts = useMemo(() => canEdit(permissions, "contracts"), [permissions]);
  const canDeleteContracts = useMemo(() => canDelete(permissions, "contracts"), [permissions]);
  const canApproveContracts = useMemo(() => canApprove(permissions, "contracts"), [permissions]);

  const [contract, setContract] = useState<Contract | null>(null);
  const [incidents, setIncidents] = useState<ContractIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [contractEditLoading, setContractEditLoading] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [isEditContractModalOpen, setIsEditContractModalOpen] = useState(false);
  const [isEditIncidentModalOpen, setIsEditIncidentModalOpen] = useState(false);
  const [isCreateIncidentModalOpen, setIsCreateIncidentModalOpen] = useState(false);
  const [incidentCreateForm, setIncidentCreateForm] =
    useState<ContractIncidentFormState>(EMPTY_INCIDENT_FORM);
  const [incidentEditForm, setIncidentEditForm] =
    useState<ContractIncidentFormState>(EMPTY_INCIDENT_FORM);

  const applyContractData = useCallback((nextContract: Contract) => {
    setContract(nextContract);
    setIncidents(nextContract.incidents || []);
  }, []);

  const refreshContractAction = useCallback(
    async (id: number | string) => {
      const response = contractReadScope
        ? await getContractById(id, contractReadScope, contractReadOptions)
        : await getContractById(id);
      applyContractData(response.data);
      return response.data;
    },
    [applyContractData, contractReadOptions, contractReadScope]
  );

  useEffect(() => {
    async function fetchContract() {
      setLoading(true);
      setLoadError(null);

      try {
        await refreshContractAction(Number(contractId));
      } catch (error) {
        setLoadError(getErrorMessage(error, "Failed to load contract"));
      } finally {
        setLoading(false);
      }
    }

    if (contractId) {
      void fetchContract();
    }
  }, [contractId, refreshContractAction]);

  const ensureWritable = useCallback(() => {
    if (!isReadOnly) {
      return true;
    }

    setErrorMessage("Tenant is archived, this page is read-only.");
    return false;
  }, [isReadOnly]);

  const clearErrorAction = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const goBackAction = useCallback(() => {
    router.back();
  }, [router]);

  const closeEditContractModalAction = useCallback(() => {
    if (contractEditLoading) {
      return;
    }

    setIsEditContractModalOpen(false);
  }, [contractEditLoading]);

  const openEditContractModalAction = useCallback(() => {
    if (!ensureWritable()) {
      return;
    }

    setIsEditContractModalOpen(true);
  }, [ensureWritable]);

  const closeEditIncidentModalAction = useCallback(
    (force = false) => {
      if (incidentLoading && !force) {
        return;
      }

      setIsEditIncidentModalOpen(false);
      setEditingIncidentId(null);
      setIncidentEditForm(EMPTY_INCIDENT_FORM);
    },
    [incidentLoading]
  );

  const closeCreateIncidentModalAction = useCallback(
    (force = false) => {
      if (incidentLoading && !force) {
        return;
      }

      setIsCreateIncidentModalOpen(false);
      setIncidentCreateForm(EMPTY_INCIDENT_FORM);
    },
    [incidentLoading]
  );

  const openCreateIncidentModalAction = useCallback(() => {
    if (!ensureWritable()) {
      return;
    }

    setErrorMessage(null);
    setIsCreateIncidentModalOpen(true);
  }, [ensureWritable]);

  const openEditIncidentModalAction = useCallback(
    (incident: ContractIncident) => {
      if (!ensureWritable()) {
        return;
      }

      setErrorMessage(null);
      setEditingIncidentId(incident.id);
      setIncidentEditForm({
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
      });
      setIsEditIncidentModalOpen(true);
    },
    [ensureWritable]
  );

  const updateIncidentCreateFormAction = useCallback((data: Partial<ContractIncidentFormState>) => {
    setIncidentCreateForm((prev) => ({ ...prev, ...data }));
  }, []);

  const updateIncidentEditFormAction = useCallback((data: Partial<ContractIncidentFormState>) => {
    setIncidentEditForm((prev) => ({ ...prev, ...data }));
  }, []);

  const handleApproveAction = useCallback(async () => {
    if (!contract || !ensureWritable()) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      await approveContract(contract.id);
      await refreshContractAction(contract.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to approve contract"));
    } finally {
      setActionLoading(false);
    }
  }, [contract, ensureWritable, refreshContractAction]);

  const handleSoftDeleteAction = useCallback(async () => {
    if (!contract || !ensureWritable()) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Soft delete contract",
      message: `Soft delete contract "${contract.title}"?`,
      confirmLabel: "Soft delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      await deleteContract(contract.id);
      router.push("/contracts");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to soft delete contract"));
    } finally {
      setActionLoading(false);
    }
  }, [confirmAction, contract, ensureWritable, router]);

  const handleHardDeleteAction = useCallback(async () => {
    if (!contract || !ensureWritable()) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Permanently delete contract",
      message: `Permanently delete contract "${contract.title}"? This action cannot be undone.`,
      confirmLabel: "Permanently delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    if (!contract.deleted_at) {
      setErrorMessage(
        "Hard delete is available only for soft-deleted contracts. Please use Soft Delete first."
      );
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
        if (contractReadScope) {
          await hardDeleteContractScoped(contract.id, contractReadScope, contractReadOptions);
        } else {
          await hardDeleteContract(contract.id);
        }
      router.push("/contracts");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to hard delete contract"));
    } finally {
      setActionLoading(false);
    }
  }, [confirmAction, contract, contractReadOptions, contractReadScope, ensureWritable, router]);

  const handleRestoreAction = useCallback(async () => {
    if (!contract || !ensureWritable()) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (contractReadScope) {
        await restoreContractScoped(contract.id, contractReadScope, contractReadOptions);
      } else {
        await restoreContract(contract.id);
      }
      await refreshContractAction(contract.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to restore contract"));
    } finally {
      setActionLoading(false);
    }
  }, [contract, contractReadOptions, contractReadScope, ensureWritable, refreshContractAction]);

  const handleIncidentSubmitAction = useCallback(async () => {
    if (!contract || !ensureWritable()) {
      return;
    }

    if (!incidentCreateForm.title.trim() || !incidentCreateForm.description.trim()) {
      setErrorMessage("Incident title and description are required");
      return;
    }

    setIncidentLoading(true);
    setErrorMessage(null);

    try {
      const created = contractReadScope
        ? await createContractIncidentScoped(
            contract.id,
            incidentCreateForm,
            contractReadScope,
            contractReadOptions
          )
        : await createContractIncident(contract.id, incidentCreateForm);
      setIncidents((prev) => [created.data, ...prev]);
      closeCreateIncidentModalAction(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to save contract incident"));
    } finally {
      setIncidentLoading(false);
    }
  }, [closeCreateIncidentModalAction, contract, contractReadOptions, contractReadScope, ensureWritable, incidentCreateForm]);

  const handleIncidentUpdateAction = useCallback(async () => {
    if (!contract || !editingIncidentId || !ensureWritable()) {
      return;
    }

    if (!incidentEditForm.title.trim() || !incidentEditForm.description.trim()) {
      setErrorMessage("Incident title and description are required");
      return;
    }

    setIncidentLoading(true);
    setErrorMessage(null);

    try {
      const updated = contractReadScope
        ? await updateContractIncidentScoped(
            contract.id,
            editingIncidentId,
            incidentEditForm,
            contractReadScope,
            contractReadOptions
          )
        : await updateContractIncident(contract.id, editingIncidentId, incidentEditForm);
      setIncidents((prev) =>
        prev.map((incident) => (incident.id === editingIncidentId ? updated.data : incident))
      );
      closeEditIncidentModalAction(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update contract incident"));
    } finally {
      setIncidentLoading(false);
    }
  }, [
    closeEditIncidentModalAction,
    contract,
    contractReadOptions,
    contractReadScope,
    editingIncidentId,
    ensureWritable,
    incidentEditForm,
  ]);

  const handleIncidentDeleteAction = useCallback(
    async (incidentId: number) => {
      if (!contract || !ensureWritable()) {
        return;
      }

      const confirmed = await confirmAction({
        title: "Delete related incident",
        message: "Delete this related incident?",
        confirmLabel: "Delete",
        tone: "danger",
      });

      if (!confirmed) {
        return;
      }

      setIncidentLoading(true);
      setErrorMessage(null);

      try {
        if (contractReadScope) {
          await deleteContractIncidentScoped(contract.id, incidentId, contractReadScope, contractReadOptions);
        } else {
          await deleteContractIncident(contract.id, incidentId);
        }
        setIncidents((prev) => prev.filter((incident) => incident.id !== incidentId));
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to delete contract incident"));
      } finally {
        setIncidentLoading(false);
      }
    },
    [confirmAction, contract, contractReadOptions, contractReadScope, ensureWritable]
  );

  const handleContractEditSubmitAction = useCallback(
    async (values: Record<string, string>) => {
      if (!contract || !ensureWritable()) {
        return;
      }

      setContractEditLoading(true);
      setErrorMessage(null);

      try {
        const payload: Partial<Contract> = {
          ...values,
          budget: values.budget ? parseFloat(values.budget) : undefined,
          spent: values.spent ? parseFloat(values.spent) : undefined,
        };

        await updateContract(contract.id, payload);
        await refreshContractAction(contract.id);
        setIsEditContractModalOpen(false);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to update contract"));
      } finally {
        setContractEditLoading(false);
      }
    },
    [contract, ensureWritable, refreshContractAction]
  );

  return {
    contract,
    incidents,
    loading: loading || currentUserLoading,
    loadError,
    errorMessage,
    actionLoading,
    contractEditLoading,
    incidentLoading,
    isReadOnly,
    permissions,
    canEditContracts,
    canDeleteContracts,
    canApproveContracts,
    isEditContractModalOpen,
    isEditIncidentModalOpen,
    isCreateIncidentModalOpen,
    incidentCreateForm,
    incidentEditForm,
    clearErrorAction,
    goBackAction,
    openEditContractModalAction,
    closeEditContractModalAction,
    handleApproveAction,
    handleSoftDeleteAction,
    handleHardDeleteAction,
    handleRestoreAction,
    openCreateIncidentModalAction,
    closeCreateIncidentModalAction,
    openEditIncidentModalAction,
    closeEditIncidentModalAction,
    updateIncidentCreateFormAction,
    updateIncidentEditFormAction,
    handleIncidentSubmitAction,
    handleIncidentUpdateAction,
    handleIncidentDeleteAction,
    handleContractEditSubmitAction,
  };
}
