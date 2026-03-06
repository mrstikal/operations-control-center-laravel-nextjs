"use client";

type ContractActionsProps = {
  canApproveContracts: boolean;
  canEditContracts: boolean;
  canDeleteContracts: boolean;
  isDeleted: boolean;
  isDraft: boolean;
  actionLoading: boolean;
  isReadOnly: boolean;
  onApproveAction: () => void;
  onEditAction: () => void;
  onSoftDeleteAction: () => void;
  onRestoreAction: () => void;
  onHardDeleteAction: () => void;
};

export default function ContractActions({
  canApproveContracts,
  canEditContracts,
  canDeleteContracts,
  isDeleted,
  isDraft,
  actionLoading,
  isReadOnly,
  onApproveAction,
  onEditAction,
  onSoftDeleteAction,
  onRestoreAction,
  onHardDeleteAction,
}: ContractActionsProps) {
  return (
    <div className="flex gap-2">
      {canApproveContracts && isDraft && (
        <button
          type="button"
          onClick={onApproveAction}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-70"
        >
          Approve
        </button>
      )}

      {canEditContracts && (
        <button
          type="button"
          onClick={onEditAction}
          disabled={isReadOnly}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-70"
        >
          Edit
        </button>
      )}

      {canDeleteContracts && !isDeleted && (
        <button
          type="button"
          onClick={onSoftDeleteAction}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-amber-600 px-4 py-2 text-white hover:bg-amber-500 disabled:opacity-70"
        >
          Soft Delete
        </button>
      )}

      {canEditContracts && isDeleted && (
        <button
          type="button"
          onClick={onRestoreAction}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-70"
        >
          Restore
        </button>
      )}

      {canDeleteContracts && (
        <button
          type="button"
          onClick={onHardDeleteAction}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-red-700 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-70"
        >
          Hard Delete
        </button>
      )}
    </div>
  );
}
