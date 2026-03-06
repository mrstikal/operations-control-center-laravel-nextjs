"use client";

import type { Incident } from "@/lib/types";

export default function IncidentHeader({ incident }: { incident: Incident }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{incident.title}</h1>
      <p className="mt-2 text-slate-600">Incident #{incident.incident_number ?? incident.id}</p>
    </div>
  );
}
