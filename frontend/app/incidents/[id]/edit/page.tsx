"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import { getIncidentById, updateIncident } from "@/lib/api/incidents";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canEdit } from "@/lib/permissions";
import type { Incident, Me } from "@/lib/types";

const BASE_FORM_FIELDS: FormField[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "category",
    label: "Category",
    type: "select",
    options: [
      { label: "Hardware", value: "hardware" },
      { label: "Software", value: "software" },
      { label: "Network", value: "network" },
      { label: "Security", value: "security" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "severity",
    label: "Severity",
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
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Escalated", value: "escalated" },
      { label: "Resolved", value: "resolved" },
      { label: "Closed", value: "closed" },
    ],
  },
];

export default function EditIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const { isReadOnly } = useTenantReadOnly(me);
  const canSwitchTenant = Boolean(me?.can_filter_by_tenant);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const res = await getMe();
        setMe(res.data);
        if (res.data.can_filter_by_tenant) {
          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
        setIsAuthorized(canEdit(res.data.permissions || [], "incidents"));
      } catch {
        setError("Failed to verify permissions");
      }
    }

    void checkPermissions();
  }, []);

  useEffect(() => {
    async function fetchIncident() {
      setLoading(true);
      setError(null);
      try {
        const res = await getIncidentById(Number(incidentId));
        setIncident(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incident");
      } finally {
        setLoading(false);
      }
    }

    if (incidentId) {
      void fetchIncident();
    }
  }, [incidentId]);

  async function handleSubmit(formData: Record<string, unknown>): Promise<void> {
    if (!incident) return;
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Incident> = {
        title: formData.title as string,
        description: formData.description as string,
        category: formData.category as string,
        severity: formData.severity as string,
        priority: formData.priority as string,
        status: formData.status as string,
        ...(canSwitchTenant && formData.tenant_id ? { tenant_id: Number(formData.tenant_id) } : {}),
      };

      await updateIncident(incident.id, payload);
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setSubmitting(false);
    }
  }

  const formFields: FormField[] = canSwitchTenant
    ? [
        {
          key: "tenant_id",
          label: "Tenant",
          type: "select",
          required: true,
          options: tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) })),
        },
        ...BASE_FORM_FIELDS,
      ]
    : BASE_FORM_FIELDS;

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          You do not have permission to edit incidents.
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        <button
          onClick={() => router.back()}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-slate-500">Incident not found</div>
        <button
          onClick={() => router.back()}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Incident</h1>
          <p className="mt-2 text-slate-600">Incident #{incident.incident_number ?? incident.id}</p>
        </div>
        <button
          onClick={() => router.push(`/incidents/${incident.id}`)}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Incident Number</label>
          <div className="mt-1 text-sm text-slate-900">
            {incident.incident_number ?? incident.id}
          </div>
        </div>

        <FormBuilder
          fields={formFields}
          initialValues={{
            tenant_id: incident.tenant?.id ? String(incident.tenant.id) : "",
            title: incident.title || "",
            description: incident.description || "",
            category: incident.category || "",
            severity: incident.severity || "",
            priority: incident.priority || "",
            status: incident.status || "",
          }}
          onSubmitAction={(data) => void handleSubmit(data)}
          submitLabel={submitting ? "Saving..." : "Save Changes"}
          loading={submitting || isReadOnly}
        />
      </div>
    </div>
  );
}
