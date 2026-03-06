"use client";

import type { LifecycleAction } from "@/hooks/assets/useAssetDetail";

type AssetActionsProps = {
  assetId: number;
  status: string;
  isDeleted: boolean;
  canEditAssets: boolean;
  canDeleteAssets: boolean;
  actionLoading: boolean;
  isReadOnly: boolean;
  onEditAction: (assetId: number) => void;
  onLifecycleAction: (action: Exclude<LifecycleAction, null>) => void;
};

export default function AssetActions({
  assetId,
  status,
  isDeleted,
  canEditAssets,
  canDeleteAssets,
  actionLoading,
  isReadOnly,
  onEditAction,
  onLifecycleAction,
}: AssetActionsProps) {
  return (
    <div className="flex gap-2">
      {canEditAssets && !isDeleted && (
        <>
          <button
            type="button"
            onClick={() => onEditAction(assetId)}
            disabled={isReadOnly}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-70"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onLifecycleAction("reassign")}
            disabled={actionLoading || isReadOnly}
            className="rounded-sm bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-70"
          >
            Reassign
          </button>

          <button
            type="button"
            onClick={() => onLifecycleAction("transfer")}
            disabled={actionLoading || isReadOnly}
            className="rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-70"
          >
            Transfer
          </button>

          {status !== "retired" && (
            <button
              type="button"
              onClick={() => onLifecycleAction("retire")}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 disabled:opacity-70"
            >
              Retire
            </button>
          )}
        </>
      )}

      {canDeleteAssets && !isDeleted && (
        <>
          {status !== "disposed" && (
            <button
              type="button"
              onClick={() => onLifecycleAction("dispose")}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-orange-600 px-4 py-2 text-white hover:bg-orange-500 disabled:opacity-70"
            >
              Dispose
            </button>
          )}

          <button
            type="button"
            onClick={() => onLifecycleAction("delete")}
            disabled={actionLoading || isReadOnly}
            className="rounded-sm bg-amber-600 px-4 py-2 text-white hover:bg-amber-500 disabled:opacity-70"
          >
            Soft Delete
          </button>
        </>
      )}

      {canEditAssets && isDeleted && (
        <button
          type="button"
          onClick={() => onLifecycleAction("restore")}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-70"
        >
          Restore
        </button>
      )}

      {canDeleteAssets && isDeleted && (
        <button
          type="button"
          onClick={() => onLifecycleAction("hard-delete")}
          disabled={actionLoading || isReadOnly}
          className="rounded-sm bg-red-700 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-70"
        >
          Hard Delete
        </button>
      )}
    </div>
  );
}
