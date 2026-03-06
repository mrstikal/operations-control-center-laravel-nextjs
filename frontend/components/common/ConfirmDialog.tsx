"use client";

import ModalShell from "@/components/common/ModalShell";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  isOpen: boolean;
  loading?: boolean;
  message: string;
  onCancelAction: () => void;
  onConfirmAction: () => void;
  title: string;
  tone?: "default" | "danger";
};

export default function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  isOpen,
  loading = false,
  message,
  onCancelAction,
  onConfirmAction,
  title,
  tone = "default",
}: ConfirmDialogProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onCloseAction={onCancelAction}
      title={title}
      loading={loading}
      maxWidth="md"
    >
      <p className="text-sm text-slate-700">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelAction}
          disabled={loading}
          className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirmAction}
          disabled={loading}
          className={
            tone === "danger"
              ? "rounded-sm bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60"
              : "rounded-sm bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-60"
          }
        >
          {loading ? "Working..." : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
