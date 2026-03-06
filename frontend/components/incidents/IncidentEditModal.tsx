"use client";

import { useMemo } from "react";
import ModalShell from "@/components/common/ModalShell";
import FormBuilder, { type FormField } from "@/components/common/FormBuilder";
import type { Incident } from "@/lib/types";

const FORM_FIELDS: FormField[] = [
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

type IncidentEditModalProps = {
  isOpen: boolean;
  incident: Incident | null;
  loading: boolean;
  error?: string | null;
  onCloseAction: () => void;
  onSubmitAction: (data: Record<string, string>) => Promise<void>;
};

export default function IncidentEditModal({
  isOpen,
  incident,
  loading,
  error,
  onCloseAction,
  onSubmitAction,
}: IncidentEditModalProps) {
  const formData = useMemo(() => {
    if (!incident) {
      return {
        title: "",
        description: "",
        category: "",
        severity: "",
        priority: "",
        status: "",
      };
    }

    return {
      title: incident.title || "",
      description: incident.description || "",
      category: incident.category || "",
      severity: incident.severity || "",
      priority: incident.priority || "",
      status: incident.status || "",
    };
  }, [incident]);

  if (!incident) {
    return null;
  }

  return (
    <ModalShell isOpen={isOpen} onCloseAction={onCloseAction} title="Edit Incident">
      {error && (
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700">Incident Number</label>
        <div className="mt-1 text-sm text-slate-900">{incident.incident_number ?? incident.id}</div>
      </div>

      <FormBuilder
        fields={FORM_FIELDS}
        initialValues={formData}
        onSubmitAction={onSubmitAction}
        submitLabel={loading ? "Saving..." : "Save Changes"}
        loading={loading}
      />
    </ModalShell>
  );
}
