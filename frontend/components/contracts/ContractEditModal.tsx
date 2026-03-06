"use client";

import { useMemo } from "react";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import ModalShell from "@/components/common/ModalShell";
import type { Contract } from "@/lib/types";

const CONTRACT_FORM_FIELDS: FormField[] = [
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

type ContractEditModalProps = {
  isOpen: boolean;
  contract: Contract | null;
  loading: boolean;
  onCloseAction: () => void;
  onSubmitAction: (values: Record<string, string>) => Promise<void>;
};

export default function ContractEditModal({
  isOpen,
  contract,
  loading,
  onCloseAction,
  onSubmitAction,
}: ContractEditModalProps) {
  const initialValues = useMemo(() => {
    if (!contract) {
      return {};
    }

    return {
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
  }, [contract]);

  if (!contract) {
    return null;
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Edit Contract"
      loading={loading}
    >
      <FormBuilder
        key={`${contract.id}-${contract.updated_at ?? ""}`}
        fields={CONTRACT_FORM_FIELDS}
        initialValues={initialValues}
        submitLabel="Update Contract"
        loading={loading}
        onSubmitAction={onSubmitAction}
      />
    </ModalShell>
  );
}
