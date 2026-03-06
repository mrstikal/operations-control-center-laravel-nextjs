"use client";

type IncidentActionsProps = {
  isDeleted: boolean;
  status: string;
  canEscalateIncidents: boolean;
  canCloseIncidents: boolean;
  canDeleteIncidents: boolean;
  canEditIncidents: boolean;
  actionLoading: boolean;
  isReadOnly: boolean;
  onEscalateAction: () => void;
  onCloseAction: () => void;
  onSoftDeleteAction: () => void;
  onRestoreAction: () => void;
  onHardDeleteAction: () => void;
};

export default function IncidentActions({
  isDeleted,
  status,
  canEscalateIncidents,
  canCloseIncidents,
  canDeleteIncidents,
  canEditIncidents,
  actionLoading,
  isReadOnly,
  onEscalateAction,
  onCloseAction,
  onSoftDeleteAction,
  onRestoreAction,
  onHardDeleteAction,
}: IncidentActionsProps) {
  return (
    <div className="flex gap-2">
      {isDeleted ? (
        <>
          {canEditIncidents && (
            <button
              type="button"
              onClick={onRestoreAction}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-70"
            >
              Restore
            </button>
          )}
          {canDeleteIncidents && (
            <button
              type="button"
              onClick={onHardDeleteAction}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-red-700 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-70"
            >
              Hard Delete
            </button>
          )}
        </>
      ) : (
        <>
          {canEscalateIncidents && status !== "escalated" && (
            <button
              type="button"
              onClick={onEscalateAction}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-orange-600 px-4 py-2 text-white hover:bg-orange-500 disabled:opacity-70"
            >
              Escalate
            </button>
          )}

          {canCloseIncidents && status !== "closed" && (
            <button
              type="button"
              onClick={onCloseAction}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-70"
            >
              Close
            </button>
          )}

          {canDeleteIncidents && (
            <button
              type="button"
              onClick={onSoftDeleteAction}
              disabled={actionLoading || isReadOnly}
              className="rounded-sm bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-500 disabled:opacity-70"
            >
              Soft Delete
            </button>
          )}
        </>
      )}
    </div>
  );
}
