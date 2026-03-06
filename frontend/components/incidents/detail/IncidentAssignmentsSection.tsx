"use client";

import type { IncidentAssignment } from "@/lib/api/incidents";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function IncidentAssignmentsSection({
  assignments,
}: {
  assignments: IncidentAssignment[];
}) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Assignments</h3>
      {assignments.length > 0 ? (
        <div className="mt-4 space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-sm border border-slate-100 bg-slate-50 p-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">{assignment.user.name}</div>
                <div className="text-xs text-slate-500">{assignment.role}</div>
              </div>
              <div className="text-xs text-slate-500">
                {formatDateOrDash(assignment.assigned_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-500">No assignments yet.</div>
      )}
    </div>
  );
}
