"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import { getAssetById, updateAsset } from "@/lib/api/assets";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { listAssetCategories, type AssetCategory } from "@/lib/api/assetCategories";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import type { Asset, Me } from "@/lib/types";

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = Number(params.id);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const { isReadOnly } = useTenantReadOnly(me);
  const canSwitchTenant = Boolean(me?.can_filter_by_tenant);

  // Load asset categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await listAssetCategories();
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }

    void fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await getMe();
        setMe(res.data);
        if (res.data.can_filter_by_tenant) {
          const tenantsRes = await listTenants();
          setTenants(tenantsRes.data ?? []);
        }
      } catch {
        setMe(null);
      }
    }

    void fetchMe();

    async function fetchAsset() {
      setLoading(true);
      setError(null);

      try {
        const res = await getAssetById(assetId);
        setAsset(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load asset");
      } finally {
        setLoading(false);
      }
    }

    void fetchAsset();
  }, [assetId]);

  async function handleSubmit(values: Record<string, string>): Promise<void> {
    if (!asset) {
      return;
    }

    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> & { reason?: string } = { ...values };

      if (canSwitchTenant && values.tenant_id) {
        payload.tenant_id = values.tenant_id;
      }

      if (values.status && values.status !== asset.status) {
        const enteredReason = values.reason?.trim();
        if (!enteredReason) {
          setError("Status change reason is required.");
          return;
        }

        payload.reason = enteredReason;
      }

      await updateAsset(assetId, payload);
      router.push(`/assets/${assetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update asset");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading asset...</div>;
  }

  if (error && !asset) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          Asset not found
        </div>
      </div>
    );
  }

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
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Operational", value: "operational" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Repair", value: "repair" },
        { label: "Retired", value: "retired" },
        { label: "Disposed", value: "disposed" },
      ],
    },
    {
      key: "reason",
      label: "Status Change Reason",
      type: "textarea",
      placeholder: "Describe why the status is changing",
    },
    { key: "location", label: "Location", required: true },
    { key: "department", label: "Department" },
    { key: "manufacturer", label: "Manufacturer" },
    { key: "model", label: "Model" },
    { key: "acquisition_date", label: "Acquisition Date", type: "date" },
    { key: "warranty_expiry", label: "Warranty Expiry", type: "date" },
  ];

  const initialValues: Record<string, string> = {
    tenant_id: asset.tenant?.id ? String(asset.tenant.id) : "",
    name: asset.name || "",
    asset_tag: asset.asset_tag || "",
    serial_number: asset.serial_number || "",
    description: asset.description || "",
    category_id:
      typeof asset.category === "object" && asset.category
        ? String(asset.category.id)
        : asset.category_id
          ? String(asset.category_id)
          : "",
    status: asset.status || "",
    reason: "",
    location: asset.location || "",
    department: asset.department || "",
    manufacturer: asset.manufacturer || "",
    model: asset.model || "",
    acquisition_date: asset.acquisition_date || "",
    warranty_expiry: asset.warranty_expiry || "",
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Asset</h1>
        <p className="text-sm text-slate-600">Asset #{asset.asset_tag || asset.id}</p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <FormBuilder
          fields={formFields}
          initialValues={initialValues}
          onSubmitAction={handleSubmit}
          submitLabel={submitting ? "Saving..." : "Save Changes"}
          loading={submitting || isReadOnly}
        />
      </div>
    </div>
  );
}
