"use client";

import ModalShell from "@/components/common/ModalShell";
import type { Tenant } from "@/lib/api/tenants";
import type { TenantFormState } from "@/hooks/tenants/useTenantManagement";

type TenantFormModalProps = {
  isOpen: boolean;
  editing: Tenant | null;
  form: TenantFormState;
  saving: boolean;
  onCloseAction: () => void;
  onSubmitAction: () => void;
  onFormChangeAction: (patch: Partial<TenantFormState>) => void;
};

export default function TenantFormModal({
  isOpen,
  editing,
  form,
  saving,
  onCloseAction,
  onSubmitAction,
  onFormChangeAction,
}: TenantFormModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title={editing ? "Edit Tenant" : "Create Tenant"}
      loading={saving}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onFormChangeAction({ name: event.target.value })}
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => onFormChangeAction({ description: event.target.value })}
            rows={3}
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={form.status}
            onChange={(event) =>
              onFormChangeAction({ status: event.target.value as TenantFormState["status"] })
            }
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCloseAction}
            disabled={saving}
            className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitAction}
            disabled={saving}
            className="rounded-sm bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : editing ? "Update Tenant" : "Create Tenant"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
