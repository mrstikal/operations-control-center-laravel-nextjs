"use client";

import { useCallback, useState } from "react";
import ModalShell from "@/components/common/ModalShell";
import SearchableSelect, { type SearchableSelectOption } from "@/components/common/SearchableSelect";
import type { CreateMaintenanceSchedulePayload, MaintenanceSchedule } from "@/lib/types";
import { formatDateForInput } from "@/lib/formatters/date";

type MaintenanceScheduleFormProps = {
  isOpen: boolean;
  editing: MaintenanceSchedule | null;
  loading: boolean;
  error: string | null;
  onCloseAction: () => void;
  onSubmitAction: (payload: CreateMaintenanceSchedulePayload) => Promise<void>;
  /** Shown only in create mode (editing === null) to pick the target asset */
  assetPickerOptions?: SearchableSelectOption[];
  selectedAssetId?: number | string | "";
  onAssetIdChangeAction?: (id: number | string) => void;
};

const FREQUENCY_OPTIONS: SearchableSelectOption[] = [
  { id: "daily", value: "daily", label: "Daily" },
  { id: "weekly", value: "weekly", label: "Weekly" },
  { id: "monthly", value: "monthly", label: "Monthly" },
  { id: "quarterly", value: "quarterly", label: "Quarterly" },
  { id: "yearly", value: "yearly", label: "Yearly" },
  { id: "custom", value: "custom", label: "Custom interval" },
];

function buildInitialForm(editing: MaintenanceSchedule | null): CreateMaintenanceSchedulePayload {
  if (editing) {
    return {
      frequency: editing.frequency,
      description: editing.description,
      interval_days: editing.interval_days ?? undefined,
      next_due_date: formatDateForInput(editing.next_due_date),
      is_active: editing.is_active,
    };
  }
  return {
    frequency: "monthly",
    description: "",
    interval_days: undefined,
    next_due_date: "",
    is_active: true,
  };
}

export default function MaintenanceScheduleForm({
  isOpen,
  editing,
  loading,
  error,
  onCloseAction,
  onSubmitAction,
  assetPickerOptions,
  selectedAssetId,
  onAssetIdChangeAction,
}: MaintenanceScheduleFormProps) {
  const [form, setForm] = useState<CreateMaintenanceSchedulePayload>(() => buildInitialForm(editing));

  const set = useCallback(<K extends keyof CreateMaintenanceSchedulePayload>(
    key: K,
    value: CreateMaintenanceSchedulePayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const payload: CreateMaintenanceSchedulePayload = {
        ...form,
        interval_days: form.interval_days ? Number(form.interval_days) : undefined,
        next_due_date: form.next_due_date || undefined,
      };
      await onSubmitAction(payload);
    },
    [form, onSubmitAction]
  );

  const showIntervalDays = form.frequency === "custom" || !!form.interval_days;

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title={editing ? "Edit Maintenance Schedule" : "Add Maintenance Schedule"}
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

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            required
            disabled={loading}
            placeholder="e.g. Quarterly preventive maintenance"
          />
        </div>

        {/* Frequency + Interval */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Frequency <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={FREQUENCY_OPTIONS}
              value={form.frequency}
              onChange={(val) => set("frequency", val as CreateMaintenanceSchedulePayload["frequency"])}
              placeholder="Select frequency…"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Interval (days){form.frequency === "custom" && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="number"
              min="1"
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.interval_days ?? ""}
              onChange={(e) => set("interval_days", e.target.value ? Number(e.target.value) : undefined)}
              disabled={loading}
              required={form.frequency === "custom"}
              placeholder={showIntervalDays ? "e.g. 90" : "Optional override"}
            />
          </div>
        </div>

        {/* Next due date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Next due date</label>
          <input
            type="date"
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            value={form.next_due_date ?? ""}
            onChange={(e) => set("next_due_date", e.target.value)}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-slate-500">
            If blank, calculated automatically from today + interval days.
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="schedule-is-active"
            checked={form.is_active ?? true}
            onChange={(e) => set("is_active", e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-slate-300 text-slate-700"
          />
          <label htmlFor="schedule-is-active" className="text-sm text-slate-700">
            Active (will be evaluated for due/overdue alerts)
          </label>
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
            {loading ? "Saving…" : editing ? "Save changes" : "Add schedule"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
