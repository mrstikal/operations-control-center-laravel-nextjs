"use client";

import type { IncidentTimelineEvent } from "@/lib/api/incidents";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function IncidentTimelineSection({
  timeline,
}: {
  timeline: IncidentTimelineEvent[];
}) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
      {timeline.length > 0 ? (
        <div className="mt-4 space-y-3">
          {timeline.map((event) => (
            <div key={event.id} className="border-l-2 border-slate-300 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{event.message}</div>
                  {event.user && <div className="text-xs text-slate-600">By {event.user.name}</div>}
                </div>
                <div className="text-xs text-slate-500">{formatDateOrDash(event.occurred_at)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-500">No timeline events yet.</div>
      )}
    </div>
  );
}
