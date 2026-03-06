"use client";

import ModalShell from "@/components/common/ModalShell";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { User } from "@/lib/api/users";

type EscalationForm = {
  escalated_to: string;
  escalation_level: string;
  reason: string;
  notes: string;
};

type IncidentEscalationModalProps = {
  isOpen: boolean;
  users: User[];
  loading: boolean;
  isReadOnly: boolean;
  form: EscalationForm;
  onCloseAction: () => void;
  onSubmitAction: () => void;
  onFormChangeAction: (patch: Partial<EscalationForm>) => void;
};

export default function IncidentEscalationModal({
  isOpen,
  users,
  loading,
  isReadOnly,
  form,
  onCloseAction,
  onSubmitAction,
  onFormChangeAction,
}: IncidentEscalationModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Escalate Incident"
      loading={loading}
      maxWidth="md"
    >
      <div className="space-y-4">
        <SearchableSelect
          options={users.map((user) => ({
            id: user.id,
            label: `${user.name} (${user.email})`,
            value: String(user.id),
          }))}
          value={form.escalated_to}
          onChange={(val) => onFormChangeAction({ escalated_to: String(val) })}
          label="Escalate To"
          required
          disabled={isReadOnly}
          loading={users.length === 0}
        />

        <SearchableSelect
          options={[
            { id: 1, label: "Level 1", value: "level_1" },
            { id: 2, label: "Level 2", value: "level_2" },
            { id: 3, label: "Level 3", value: "level_3" },
            { id: 4, label: "Level 4", value: "level_4" },
          ]}
          value={form.escalation_level}
          onChange={(val) => onFormChangeAction({ escalation_level: String(val) })}
          label="Escalation Level"
          required
          disabled={isReadOnly}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Reason <span className="text-red-600">*</span>
          </label>
          <textarea
            required
            value={form.reason}
            onChange={(event) => onFormChangeAction({ reason: event.target.value })}
            disabled={isReadOnly}
            placeholder="Why is this being escalated?"
            className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
          <textarea
            value={form.notes}
            onChange={(event) => onFormChangeAction({ notes: event.target.value })}
            disabled={isReadOnly}
            placeholder="Additional notes..."
            className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            rows={2}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCloseAction}
            disabled={loading || isReadOnly}
            className="rounded-sm bg-slate-300 px-4 py-2 text-slate-900 hover:bg-slate-200 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitAction}
            disabled={loading || isReadOnly}
            className="rounded-sm bg-orange-600 px-4 py-2 text-white hover:bg-orange-500 disabled:opacity-60"
          >
            {loading ? "Escalating..." : "Escalate"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
