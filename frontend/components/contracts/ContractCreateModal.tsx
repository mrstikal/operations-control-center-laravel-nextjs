"use client";

import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import ModalShell from "@/components/common/ModalShell";
import type { Tenant } from "@/lib/api/tenants";

const BASE_FORM_FIELDS: FormField[] = [
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

type ContractCreateModalProps = {
  isOpen: boolean;
  loading: boolean;
  canSwitchTenant: boolean;
  tenants: Tenant[];
  defaultTenantId: number | null;
  onCloseAction: () => void;
  onSubmitAction: (values: Record<string, string>) => Promise<void>;
};

export default function ContractCreateModal({
  isOpen,
  loading,
  canSwitchTenant,
  tenants,
  defaultTenantId,
  onCloseAction,
  onSubmitAction,
}: ContractCreateModalProps) {
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

  const initialValues =
    canSwitchTenant && defaultTenantId ? { tenant_id: String(defaultTenantId) } : undefined;

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="New Contract"
      loading={loading}
    >
      <FormBuilder
        key={`contract-create-${defaultTenantId ?? "none"}-${tenants.length}`}
        fields={formFields}
        initialValues={initialValues}
        submitLabel="Create Contract"
        loading={loading}
        onSubmitAction={onSubmitAction}
      />
    </ModalShell>
  );
}

