"use client";

import { useMemo } from "react";
import ModalShell from "@/components/common/ModalShell";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import type { Asset } from "@/lib/types";

type AssetCategory = {
  id: number;
  name: string;
};

type AssetEditModalProps = {
  isOpen: boolean;
  asset: Asset | null;
  categories: AssetCategory[];
  loading: boolean;
  error?: string | null;
  onCloseAction: () => void;
  onSubmitAction: (data: Record<string, string>) => Promise<void>;
};

export default function AssetEditModal({
  isOpen,
  asset,
  categories,
  loading,
  error,
  onCloseAction,
  onSubmitAction,
}: AssetEditModalProps) {
  const formFields: FormField[] = useMemo(
    () => [
      { key: "name", label: "Name", required: true },
      { key: "asset_tag", label: "Asset Tag", required: true },
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "category",
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
    ],
    [categories]
  );
  const formData = useMemo(() => {
    if (!asset) {
      return {
        name: "",
        asset_tag: "",
        description: "",
        category: "",
        status: "",
        reason: "",
        location: "",
      };
    }

    return {
      name: asset.name || "",
      asset_tag: asset.asset_tag || "",
      description: asset.description || "",
      category:
        typeof asset.category === "object" && asset.category
          ? String(asset.category.id)
          : asset.category_id
            ? String(asset.category_id)
            : "",
      status: asset.status || "",
      reason: "",
      location: asset.location || "",
    };
  }, [asset]);

  if (!asset) {
    return null;
  }

  return (
    <ModalShell isOpen={isOpen} onCloseAction={onCloseAction} title="Edit Asset">
      {error && (
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <FormBuilder
        fields={formFields}
        initialValues={formData}
        onSubmitAction={onSubmitAction}
        submitLabel={loading ? "Saving..." : "Save Changes"}
        loading={loading}
      />
    </ModalShell>
  );
}
