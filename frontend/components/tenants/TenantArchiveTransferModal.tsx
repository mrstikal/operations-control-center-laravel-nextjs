"use client";

import ModalShell from "@/components/common/ModalShell";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { Tenant, TenantTransferUser } from "@/lib/api/tenants";

type TenantArchiveTransferModalProps = {
  isOpen: boolean;
  tenantName?: string;
  users: TenantTransferUser[];
  transferTargets: Tenant[];
  selectedTargetTenantId: number | null;
  loading: boolean;
  submitting: boolean;
  onCloseAction: () => void;
  onTargetChangeAction: (value: number) => void;
  onSubmitAction: () => void;
};

export default function TenantArchiveTransferModal({
  isOpen,
  tenantName,
  transferTargets,
  selectedTargetTenantId,
  loading,
  submitting,
  onCloseAction,
  onTargetChangeAction,
  onSubmitAction,
}: TenantArchiveTransferModalProps) {

  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Archive tenant requires user transfer"
      loading={loading || submitting}
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tenant <span className="font-medium">{tenantName ?? "-"}</span> has assigned users. Select a
          target tenant to transfer users before archiving.
        </div>

        <SearchableSelect
          label="Target tenant"
          required
          placeholder="Select target tenant"
          value={selectedTargetTenantId ?? ""}
          options={transferTargets
            .filter((tenant) => !tenant.deleted_at)
            .map((tenant) => ({
              id: tenant.id,
              value: tenant.id,
              label: tenant.name,
            }))}
          onChange={(value) => onTargetChangeAction(Number(value))}
          disabled={loading || submitting}
          loading={loading}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCloseAction}
            disabled={loading || submitting}
            className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitAction}
            disabled={loading || submitting || !selectedTargetTenantId}
            className="rounded-sm bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60"
          >
            {submitting ? "Transferring..." : "Transfer users and archive"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

