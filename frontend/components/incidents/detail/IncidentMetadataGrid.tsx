"use client";

import type { Incident } from "@/lib/types";

export default function IncidentMetadataGrid({ incident }: { incident: Incident }) {
  const severity = incident.severity ?? "medium";
  const severityColor =
    severity === "critical"
      ? "bg-red-600"
      : severity === "high"
        ? "bg-orange-600"
        : severity === "medium"
          ? "bg-yellow-600"
          : "bg-green-600";

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <div className="text-xs font-medium text-slate-500">Status</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{incident.status}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Severity</div>
        <span
          className={`mt-1 inline-block status-badge ${severityColor}`}
        >
          {severity}
        </span>
      </div>
    </div>
  );
}
