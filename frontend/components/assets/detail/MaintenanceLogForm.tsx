"use client";

import { useCallback, useState } from "react";
import ModalShell from "@/components/common/ModalShell";
import SearchableSelect, { type SearchableSelectOption } from "@/components/common/SearchableSelect";
import type { CreateMaintenanceLogPayload, MaintenanceLog } from "@/lib/types";
import { formatDateForInput } from "@/lib/formatters/date";

type MaintenanceLogFormProps = {
  isOpen: boolean;
  editing: MaintenanceLog | null;
  loading: boolean;
  error: string | null;
  onCloseAction: () => void;
  onSubmitAction: (payload: CreateMaintenanceLogPayload) => Promise<void>;
  /** Shown only in create mode (editing === null) to pick the target asset */
  assetPickerOptions?: SearchableSelectOption[];
  selectedAssetId?: number | string | "";
  onAssetIdChangeAction?: (id: number | string) => void;
};

const MAINTENANCE_TYPES: SearchableSelectOption[] = [
  { id: "preventive", value: "preventive", label: "Preventive" },
  { id: "corrective", value: "corrective", label: "Corrective" },
  { id: "inspection", value: "inspection", label: "Inspection" },
  { id: "repair", value: "repair", label: "Repair" },
];

function buildInitialForm(editing: MaintenanceLog | null): CreateMaintenanceLogPayload {
  if (editing) {
    return {
      type: editing.type,
      description: editing.description,
      hours_spent: editing.hours_spent ?? undefined,
      cost: editing.cost ?? undefined,
      performed_at: formatDateForInput(editing.performed_at),
      notes: editing.notes ?? "",
    };
  }
  return {
    type: "preventive",
    description: "",
    hours_spent: undefined,
    cost: undefined,
    performed_at: formatDateForInput(new Date().toISOString()),
    notes: "",
  };
}

export default function MaintenanceLogForm({
  isOpen,
  editing,
  loading,
  error,
  onCloseAction,
  onSubmitAction,
  assetPickerOptions,
  selectedAssetId,
  onAssetIdChangeAction,
}: MaintenanceLogFormProps) {
  // Initialized once per mount - parent uses key={editingLog?.id ?? "create"} to remount on change
  const [form, setForm] = useState<CreateMaintenanceLogPayload>(() => buildInitialForm(editing));

  const set = useCallback(<K extends keyof CreateMaintenanceLogPayload>(
    key: K,
    value: CreateMaintenanceLogPayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const payload: CreateMaintenanceLogPayload = {
        ...form,
        hours_spent: form.hours_spent ? Number(form.hours_spent) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        performed_at: form.performed_at || undefined,
        notes: form.notes || undefined,
      };
      await onSubmitAction(payload);
    },
    [form, onSubmitAction]
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title={editing ? "Edit Maintenance Log" : "Log Maintenance"}
      loading={loading}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Asset picker – only in create mode when options are provided */}
        {!editing && assetPickerOptions && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Asset <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={assetPickerOptions}
              value={selectedAssetId ?? ""}
              onChange={onAssetIdChangeAction ?? (() => undefined)}
              placeholder="Select asset…"
              required
              disabled={loading}
            />
          </div>
        )}

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Type <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={MAINTENANCE_TYPES}
            value={form.type}
            onChange={(val) => set("type", val as CreateMaintenanceLogPayload["type"])}
            placeholder="Select type…"
            required
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            required
            disabled={loading}
            placeholder="Describe what was performed..."
          />
        </div>

        {/* Performed at */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Performed at</label>
          <input
            type="date"
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            value={form.performed_at ?? ""}
            onChange={(e) => set("performed_at", e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Hours spent + Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hours spent</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.hours_spent ?? ""}
              onChange={(e) => set("hours_spent", e.target.value ? Number(e.target.value) : undefined)}
              disabled={loading}
              placeholder="e.g. 2.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cost</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.cost ?? ""}
              onChange={(e) => set("cost", e.target.value ? Number(e.target.value) : undefined)}
              disabled={loading}
              placeholder="e.g. 150.00"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            disabled={loading}
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCloseAction}
            disabled={loading}
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-sm bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Saving…" : editing ? "Save changes" : "Log maintenance"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
