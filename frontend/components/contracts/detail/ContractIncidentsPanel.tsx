"use client";

import type { ContractIncident } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

type ContractIncidentsPanelProps = {
  incidents: ContractIncident[];
  canEditContracts: boolean;
  canDeleteContracts: boolean;
  isReadOnly: boolean;
  onAddIncidentAction: () => void;
  onEditIncidentAction: (incident: ContractIncident) => void;
  onDeleteIncidentAction: (incidentId: number) => void;
};

export default function ContractIncidentsPanel({
  incidents,
  canEditContracts,
  canDeleteContracts,
  isReadOnly,
  onAddIncidentAction,
  onEditIncidentAction,
  onDeleteIncidentAction,
}: ContractIncidentsPanelProps) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Related Incidents</h3>
        {canEditContracts && (
          <button
            type="button"
            disabled={isReadOnly}
            onClick={onAddIncidentAction}
            className="rounded-sm bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            + Add Incident
          </button>
        )}
      </div>

      {incidents.length > 0 ? (
        <div className="mt-4 space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-sm border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{incident.title}</div>
                  <div className="mt-1 text-sm text-slate-700">{incident.description}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-sm bg-slate-100 px-2 py-1">
                      Severity: {incident.severity}
                    </span>
                    <span className="rounded-sm bg-slate-100 px-2 py-1">
                      Status: {incident.status}
                    </span>
                    <span>Reported: {formatDateOrDash(incident.reported_at)}</span>
                  </div>
                </div>

                {(canEditContracts || canDeleteContracts) && (
                  <div className="flex gap-2">
                    {canEditContracts && (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onEditIncidentAction(incident)}
                        className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteContracts && (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onDeleteIncidentAction(incident.id)}
                        className="rounded-sm bg-red-700 px-3 py-2 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-500">No related incidents yet.</div>
      )}
    </div>
  );
}
