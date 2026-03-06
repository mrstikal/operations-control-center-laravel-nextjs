"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import { createAsset } from "@/lib/api/assets";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { getTenantContext } from "@/lib/auth";
import { listAssetCategories, type AssetCategory } from "@/lib/api/assetCategories";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import type { Me } from "@/lib/types";

export default function CreateAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [defaultTenantId, setDefaultTenantId] = useState<number | null>(null);
  const { isReadOnly } = useTenantReadOnly(me);
  const canSwitchTenant = Boolean(me?.can_filter_by_tenant);

  // Load asset categories
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await getMe();
        setMe(res.data);
        if (res.data.can_filter_by_tenant) {
          const tenantContext = getTenantContext();
          setDefaultTenantId(tenantContext ?? res.data.default_tenant_id ?? res.data.tenant_id);
          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
      } catch {
        setMe(null);
      }
    }

    void fetchMe();

    async function fetchCategories() {
      try {
        const res = await listAssetCategories();
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError("Failed to load categories");
      }
    }

    void fetchCategories();
  }, []);

  const formFields: FormField[] = [
    ...(canSwitchTenant
      ? [
          {
            key: "tenant_id",
            label: "Tenant",
            type: "select" as const,
            required: true,
            options: tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) })),
          },
        ]
      : []),
    { key: "name", label: "Name", required: true },
    { key: "asset_tag", label: "Asset Tag", required: true },
    { key: "serial_number", label: "Serial Number" },
    { key: "description", label: "Description", type: "textarea" },
    {
      key: "category_id",
      label: "Category",
      type: "select",
      required: true,
      options: categories.map((c) => ({ label: c.name, value: String(c.id) })),
    },
    { key: "location", label: "Location", required: true },
    { key: "department", label: "Department" },
    { key: "manufacturer", label: "Manufacturer" },
    { key: "model", label: "Model" },
    { key: "acquisition_date", label: "Acquisition Date", type: "date" },
    { key: "warranty_expiry", label: "Warranty Expiry", type: "date" },
  ];

  async function handleSubmit(values: Record<string, string>): Promise<void> {
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
      };

      const res = await createAsset(payload);
      router.push(`/assets/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Asset</h1>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <FormBuilder
          key={`asset-create-${defaultTenantId ?? "none"}-${tenants.length}`}
          fields={formFields}
          initialValues={
            canSwitchTenant && defaultTenantId ? { tenant_id: String(defaultTenantId) } : undefined
          }
          onSubmitAction={handleSubmit}
          submitLabel={loading ? "Creating..." : "Create Asset"}
          loading={loading || isReadOnly}
        />
      </div>
    </div>
  );
}
