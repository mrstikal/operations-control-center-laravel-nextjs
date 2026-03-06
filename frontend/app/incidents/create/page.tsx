"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createIncident } from "@/lib/api/incidents";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { getTenantContext } from "@/lib/auth";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canCreate } from "@/lib/permissions";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { Me } from "@/lib/types";

export default function CreateIncidentPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "infrastructure",
    severity: "medium",
    priority: "medium",
    tenant_id: undefined as number | undefined,
  });

  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          const tenantContext = getTenantContext();
          setFormData((prev) => ({
            ...prev,
            tenant_id: tenantContext ?? res.data.default_tenant_id ?? res.data.tenant_id,
          }));

          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
        setIsAuthorized(canCreate(res.data.permissions || [], "incidents"));
      } catch {
        setError("Failed to verify permissions");
      } finally {
        setLoading(false);
      }
    }

    void checkPermissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          You don&apos;t have permission to create incidents
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        ...(canSwitchTenant && formData.tenant_id ? { tenant_id: formData.tenant_id } : {}),
      };

      const result = await createIncident(payload);
      if (result.data?.id) {
        router.push(`/incidents/${result.data.id}`);
      } else {
        router.push("/incidents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-bold text-slate-900">Create Incident</h1>

        {error && (
          <div className="mt-4 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isReadOnly}
              placeholder="Brief incident title"
              className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isReadOnly}
              placeholder="Detailed description of the incident"
              className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {canSwitchTenant && (
              <SearchableSelect
                options={tenants.map((tenant) => ({
                  id: tenant.id,
                  label: tenant.name,
                  value: tenant.id,
                }))}
                value={formData.tenant_id ?? ""}
                onChange={(val) => setFormData({ ...formData, tenant_id: Number(val) })}
                disabled={isReadOnly}
                label="Tenant"
                required
              />
            )}

            <SearchableSelect
              options={[
                { id: 1, label: "Infrastructure", value: "infrastructure" },
                { id: 2, label: "Application", value: "application" },
                { id: 3, label: "Network", value: "network" },
                { id: 4, label: "Security", value: "security" },
                { id: 5, label: "Other", value: "other" },
              ]}
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: String(val) })}
              disabled={isReadOnly}
              label="Category"
              required
            />

            <SearchableSelect
              options={[
                { id: 1, label: "Low", value: "low" },
                { id: 2, label: "Medium", value: "medium" },
                { id: 3, label: "High", value: "high" },
                { id: 4, label: "Critical", value: "critical" },
              ]}
              value={formData.severity}
              onChange={(val) => setFormData({ ...formData, severity: String(val) })}
              disabled={isReadOnly}
              label="Severity"
              required
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { id: 1, label: "Low", value: "low" },
                { id: 2, label: "Medium", value: "medium" },
                { id: 3, label: "High", value: "high" },
                { id: 4, label: "Critical", value: "critical" },
              ]}
              value={formData.priority}
              onChange={(val) => setFormData({ ...formData, priority: String(val) })}
              disabled={isReadOnly}
              label="Priority"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-sm bg-slate-300 px-4 py-2 text-slate-900 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isReadOnly}
              className="rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Incident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
