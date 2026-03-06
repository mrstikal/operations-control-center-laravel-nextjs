"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import ContractIncidentCreateModal from "@/components/contracts/ContractIncidentCreateModal";
import ContractIncidentEditModal from "@/components/contracts/ContractIncidentEditModal";
import {
  createContractIncident,
  deleteContractIncident,
  getContractById,
  updateContract,
  updateContractIncident,
} from "@/lib/api/contracts";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import {
  buildContractDetailPath,
  buildContractScopeOptions,
  buildContractScopeQuery,
  normalizeContractTenantId,
} from "@/lib/contracts/scope";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canDelete, canEdit } from "@/lib/permissions";
import type { Contract, ContractIncident, Me, Permission } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

type ContractScopeQuery = { tenant_id?: number };
type ContractScopeOptions = { skipTenantHeader?: boolean };

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

const FORM_FIELDS: FormField[] = [
  { key: "title", label: "Title", required: true },
  { key: "contract_number", label: "Contract Number", required: true },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    required: true,
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
      { label: "Critical", value: "critical" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { label: "Draft", value: "draft" },
      { label: "Approved", value: "approved" },
      { label: "In Progress", value: "in_progress" },
      { label: "Blocked", value: "blocked" },
      { label: "Done", value: "done" },
    ],
  },
  { key: "budget", label: "Budget (USD)", type: "number" },
  { key: "spent", label: "Amount Spent (USD)", type: "number" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "due_date", label: "Due Date", type: "date" },
];

const EMPTY_INCIDENT_FORM = {
  title: "",
  description: "",
  severity: "medium" as "low" | "medium" | "high" | "critical",
  status: "open" as "open" | "in_review" | "resolved" | "closed",
};

export default function EditContractPage() {
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const params = useParams();
  const searchParams = useSearchParams();
  const contractId = params.id as string;
  const scopedTenantId = useMemo(
    () => normalizeContractTenantId(searchParams.get("tenant_id")),
    [searchParams]
  );
  const contractReadScope = useMemo(() => buildContractScopeQuery(scopedTenantId), [scopedTenantId]);
  const contractReadOptions = useMemo(() => buildContractScopeOptions(scopedTenantId), [scopedTenantId]);

  const [contract, setContract] = useState<Contract | null>(null);
  const [incidents, setIncidents] = useState<ContractIncident[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [isEditIncidentModalOpen, setIsEditIncidentModalOpen] = useState(false);
  const [isCreateIncidentModalOpen, setIsCreateIncidentModalOpen] = useState(false);
  const [incidentCreateForm, setIncidentCreateForm] = useState(EMPTY_INCIDENT_FORM);
  const [incidentEditForm, setIncidentEditForm] = useState(EMPTY_INCIDENT_FORM);
  const { isReadOnly } = useTenantReadOnly(me);
  const canSwitchTenant = Boolean(me?.can_filter_by_tenant);

  const closeEditIncidentModal = useCallback(
    (force = false): void => {
      if (incidentLoading && !force) {
        return;
      }

      setIsEditIncidentModalOpen(false);
      setEditingIncidentId(null);
      setIncidentEditForm(EMPTY_INCIDENT_FORM);
    },
    [incidentLoading]
  );

  const closeCreateIncidentModal = useCallback(
    (force = false): void => {
      if (incidentLoading && !force) {
        return;
      }

      setIsCreateIncidentModalOpen(false);
      setIncidentCreateForm(EMPTY_INCIDENT_FORM);
    },
    [incidentLoading]
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [contractRes, userRes] = await Promise.all([
          contractReadScope
            ? getContractById(Number(contractId), contractReadScope, contractReadOptions)
            : getContractById(Number(contractId)),
          getMe(),
        ]);

        const loadedContract = contractRes.data;

        setContract(loadedContract ?? null);
        setIncidents(loadedContract?.incidents || []);

        const loadedPermissions = userRes.data.permissions || [];
        setMe(userRes.data);
        if (userRes.data.can_filter_by_tenant) {
          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
        setPermissions(loadedPermissions);
        setIsAuthorized(canEdit(loadedPermissions, "contracts"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    if (contractId) {
      void fetchData();
    }
  }, [contractId, contractReadOptions, contractReadScope]);

  const handleSubmit = async (values: Record<string, string>) => {
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Contract> = {
        ...values,
        ...(canSwitchTenant && values.tenant_id ? { tenant_id: Number(values.tenant_id) } : {}),
        budget: values.budget ? parseFloat(values.budget) : undefined,
        spent: values.spent ? parseFloat(values.spent) : undefined,
      };

      const res = await updateContract(Number(contractId), payload);
      const redirectTenantId =
        (canSwitchTenant && values.tenant_id ? Number(values.tenant_id) : undefined) ??
        normalizeContractTenantId(contract?.tenant?.id) ??
        scopedTenantId;
      router.push(buildContractDetailPath(res.data.id, redirectTenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contract");
      setSubmitting(false);
    }
  };

  async function handleIncidentSubmit(): Promise<void> {
    if (!contract) return;
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }
    if (!incidentCreateForm.title.trim() || !incidentCreateForm.description.trim()) {
      setError("Incident title and description are required");
      return;
    }

    setIncidentLoading(true);
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
      closeCreateIncidentModal(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract incident");
    } finally {
      setIncidentLoading(false);
    }
  }

  async function handleIncidentUpdate(): Promise<void> {
    if (!contract || !editingIncidentId) return;
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }
    if (!incidentEditForm.title.trim() || !incidentEditForm.description.trim()) {
      setError("Incident title and description are required");
      return;
    }

    setIncidentLoading(true);
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
      closeEditIncidentModal(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contract incident");
    } finally {
      setIncidentLoading(false);
    }
  }

  async function handleIncidentDelete(incidentId: number): Promise<void> {
    if (!contract) return;
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete related incident",
      message: "Delete this related incident?",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setIncidentLoading(true);
    try {
      if (contractReadScope) {
        await deleteContractIncidentScoped(contract.id, incidentId, contractReadScope, contractReadOptions);
      } else {
        await deleteContractIncident(contract.id, incidentId);
      }
      setIncidents((prev) => prev.filter((incident) => incident.id !== incidentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contract incident");
    } finally {
      setIncidentLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized && !loading) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Edit Contract</h1>
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          You do not have permission to edit contracts.
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Edit Contract</h1>
        <div className="text-slate-500">Contract not found</div>
        <button
          onClick={() => router.back()}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  const initialValues = {
    tenant_id: contract.tenant?.id ? String(contract.tenant.id) : "",
    title: contract.title || "",
    contract_number: contract.contract_number || "",
    description: contract.description || "",
    priority: contract.priority || "medium",
    status: contract.status || "draft",
    budget: contract.budget ? String(contract.budget) : "",
    spent: contract.spent ? String(contract.spent) : "",
    start_date: contract.start_date
      ? new Date(contract.start_date).toISOString().split("T")[0]
      : "",
    due_date: contract.due_date ? new Date(contract.due_date).toISOString().split("T")[0] : "",
  };

  const formFields: FormField[] = canSwitchTenant
    ? [
        {
          key: "tenant_id",
          label: "Tenant",
          type: "select",
          required: true,
          options: tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) })),
        },
        ...FORM_FIELDS,
      ]
    : FORM_FIELDS;

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="mt-3 text-3xl font-bold">Edit Contract</h1>
          <p className="mt-2 text-slate-600">{contract.title}</p>
        </div>

        {error && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        <FormBuilder
          fields={formFields}
          initialValues={initialValues}
          submitLabel="Update Contract"
          loading={submitting || isReadOnly}
          onSubmitAction={handleSubmit}
        />

        <div className="rounded-sm border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Related Incidents</h3>
            {canEdit(permissions, "contracts") && (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setIsCreateIncidentModalOpen(true)}
                className="rounded-sm bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              >
                + Add Incident
              </button>
            )}
          </div>

          {incidents.length > 0 ? (
            <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-sm border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{incident.title}</div>
                      <div className="mt-1 text-sm text-slate-700">{incident.description}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-sm bg-slate-100 px-2 py-1">
                          Severity: {incident.severity}
                        </span>
                        <span className="rounded-sm bg-slate-100 px-2 py-1">
                          Status: {incident.status}
                        </span>
                        <span>Reported: {formatDateOrDash(incident.reported_at)}</span>
                      </div>
                    </div>
                    {(canEdit(permissions, "contracts") || canDelete(permissions, "contracts")) && (
                      <div className="flex gap-2">
                        {canEdit(permissions, "contracts") && (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => {
                              if (isReadOnly) return;
                              setEditingIncidentId(incident.id);
                              setIncidentEditForm({
                                title: incident.title,
                                description: incident.description,
                                severity: incident.severity,
                                status: incident.status,
                              });
                              setIsEditIncidentModalOpen(true);
                            }}
                            className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete(permissions, "contracts") && (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => void handleIncidentDelete(incident.id)}
                            className="rounded-sm bg-red-700 px-3 py-2 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-center text-sm text-slate-500">No related incidents yet.</div>
          )}
        </div>
      </div>

      <ContractIncidentEditModal
        isOpen={isEditIncidentModalOpen && canEdit(permissions, "contracts") && !isReadOnly}
        loading={incidentLoading || isReadOnly}
        formData={incidentEditForm}
        onCloseAction={() => closeEditIncidentModal()}
        onSubmitAction={() => void handleIncidentUpdate()}
        onFormChangeAction={(data) => setIncidentEditForm((prev) => ({ ...prev, ...data }))}
      />

      <ContractIncidentCreateModal
        isOpen={isCreateIncidentModalOpen && canEdit(permissions, "contracts") && !isReadOnly}
        loading={incidentLoading || isReadOnly}
        formData={incidentCreateForm}
        onCloseAction={() => closeCreateIncidentModal()}
        onSubmitAction={() => void handleIncidentSubmit()}
        onFormChangeAction={(data) => setIncidentCreateForm((prev) => ({ ...prev, ...data }))}
      />
    </>
  );
}
