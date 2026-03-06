"use client";

import type { Incident } from "@/lib/api";

type RecentIncidentsTableProps = {
  incidents: Incident[];
};

export default function RecentIncidentsTable({ incidents }: RecentIncidentsTableProps) {
  return (
    <div className="dashboard-card mt-4">
      <h2 className="text-xl font-bold mb-4">Recent Incidents</h2>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td>{incident.incident_number}</td>
              <td>{incident.title}</td>
              <td>{incident.severity}</td>
              <td>
                <span className="badge">{incident.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
