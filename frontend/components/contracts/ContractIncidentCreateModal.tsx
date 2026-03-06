"use client";

import { useRef } from "react";
import ModalShell from "@/components/common/ModalShell";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { ContractIncident } from "@/lib/types";

type ContractIncidentCreateModalProps = {
  isOpen: boolean;
  loading: boolean;
  formData: {
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "open" | "in_review" | "resolved" | "closed";
  };
  onCloseAction: () => void;
  onSubmitAction: () => void;
  onFormChangeAction: (data: Partial<ContractIncidentCreateModalProps["formData"]>) => void;
};

const SEVERITY_OPTIONS = [
  { id: 1, label: "Low", value: "low" },
  { id: 2, label: "Medium", value: "medium" },
  { id: 3, label: "High", value: "high" },
  { id: 4, label: "Critical", value: "critical" },
] as const;

const STATUS_OPTIONS = [
  { id: 1, label: "Open", value: "open" },
  { id: 2, label: "In Review", value: "in_review" },
  { id: 3, label: "Resolved", value: "resolved" },
  { id: 4, label: "Closed", value: "closed" },
] as const;

export default function ContractIncidentCreateModal({
  isOpen,
  loading,
  formData,
  onCloseAction,
  onSubmitAction,
  onFormChangeAction,
}: ContractIncidentCreateModalProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Add Related Incident"
      loading={loading}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <input
              ref={titleInputRef}
              value={formData.title}
              onChange={(e) => onFormChangeAction({ title: e.target.value })}
              placeholder="Incident title"
              className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400"
            />
          </div>
          <SearchableSelect
            options={[...SEVERITY_OPTIONS]}
            value={formData.severity}
            onChange={(val) =>
              onFormChangeAction({ severity: String(val) as ContractIncident["severity"] })
            }
            placeholder="Severity"
          />
        </div>
        <textarea
          value={formData.description}
          onChange={(e) => onFormChangeAction({ description: e.target.value })}
          placeholder="Incident description"
          className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400"
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <SearchableSelect
              options={[...STATUS_OPTIONS]}
              value={formData.status}
              onChange={(val) =>
                onFormChangeAction({ status: String(val) as ContractIncident["status"] })
              }
              placeholder="Status"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCloseAction}
              disabled={loading}
              className="rounded-sm bg-slate-300 px-3 py-2 text-sm text-slate-900 hover:bg-slate-200 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onSubmitAction}
              className="rounded-sm bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-70"
            >
              {loading ? "Saving..." : "Create Incident"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
