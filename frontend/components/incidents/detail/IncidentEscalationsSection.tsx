"use client";

import type { IncidentEscalation } from "@/lib/api/incidents";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function IncidentEscalationsSection({
  escalations,
}: {
  escalations: IncidentEscalation[];
}) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Escalation History</h3>
      {escalations.length > 0 ? (
        <div className="mt-4 space-y-3">
          {escalations.map((escalation) => {
            const levelLabel = escalation.escalation_level.replace("level_", "Level ");

            return (
              <div key={escalation.id} className="border-l-2 border-orange-400 bg-orange-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      Escalated to {levelLabel}
                    </div>
                    <div className="text-xs text-slate-600">
                      By <span className="font-medium">{escalation.escalated_by.name}</span> to{" "}
                      <span className="font-medium">{escalation.escalated_to.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Reason: {escalation.reason?.trim() ? escalation.reason : "—"}
                    </div>
                    {escalation.notes?.trim() && (
                      <div className="mt-1 text-xs text-slate-700">Notes: {escalation.notes}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateOrDash(escalation.escalated_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-500">No escalations yet.</div>
      )}
    </div>
  );
}
