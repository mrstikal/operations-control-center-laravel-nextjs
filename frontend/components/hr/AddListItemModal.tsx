"use client";

import ModalShell from "@/components/common/ModalShell";

type AddListItemModalProps = {
  isOpen: boolean;
  type: "skill" | "certification";
  value: string;
  onChangeAction: (value: string) => void;
  onConfirmAction: () => void;
  onCloseAction: () => void;
};

export default function AddListItemModal({
  isOpen,
  type,
  value,
  onChangeAction,
  onConfirmAction,
  onCloseAction,
}: AddListItemModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title={type === "skill" ? "Add Skill" : "Add Certification"}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {type === "skill" ? "Skill" : "Certification"}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChangeAction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirmAction();
              }
            }}
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
            placeholder={type === "skill" ? "e.g. HVAC Diagnostics" : "e.g. ITIL 4 Foundation"}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCloseAction}
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmAction}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            Add
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
