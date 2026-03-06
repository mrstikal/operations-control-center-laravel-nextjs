"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import { createContract } from "@/lib/api/contracts";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { getTenantContext } from "@/lib/auth";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canCreate } from "@/lib/permissions";
import type { Me } from "@/lib/types";

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
  { key: "budget", label: "Budget (USD)", type: "number" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "due_date", label: "Due Date", type: "date" },
];

export default function CreateContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [defaultTenantId, setDefaultTenantId] = useState<number | null>(null);
  const { isReadOnly } = useTenantReadOnly(me);
  const canSwitchTenant = Boolean(me?.can_filter_by_tenant);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const res = await getMe();
        setMe(res.data);
        if (res.data.can_filter_by_tenant) {
          const tenantContext = getTenantContext();
          setDefaultTenantId(tenantContext ?? res.data.default_tenant_id ?? res.data.tenant_id);
          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
        setIsAuthorized(canCreate(res.data.permissions || [], "contracts"));
      } catch {
        setError("Failed to verify permissions");
      } finally {
        setCheckingPermissions(false);
      }
    }

    void checkPermissions();
  }, []);

  const handleSubmit = async (values: Record<string, string>) => {
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...values,
        ...(canSwitchTenant && values.tenant_id ? { tenant_id: Number(values.tenant_id) } : {}),
        budget: values.budget ? parseFloat(values.budget) : undefined,
        priority: values.priority || "medium",
        status: "draft",
      };

      const res = await createContract(payload);
      router.push(`/contracts/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
      setLoading(false);
    }
  };

  // Show loading while checking permissions
  if (checkingPermissions) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
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
        ...FORM_FIELDS,
      ]
    : FORM_FIELDS;

  // Show unauthorized only after permissions check is complete
  if (!isAuthorized) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Create Contract</h1>
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          You do not have permission to create contracts.
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="mt-3 text-3xl font-bold">Create New Contract</h1>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <FormBuilder
        key={`contract-create-${defaultTenantId ?? "none"}-${tenants.length}`}
        fields={formFields}
        initialValues={
          canSwitchTenant && defaultTenantId ? { tenant_id: String(defaultTenantId) } : undefined
        }
        submitLabel="Create Contract"
        loading={loading || isReadOnly}
        onSubmitAction={handleSubmit}
      />
    </div>
  );
}
