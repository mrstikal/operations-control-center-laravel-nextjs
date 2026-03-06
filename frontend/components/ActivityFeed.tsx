"use client";

import { activityActionIconMap, MaterialIcon } from "@/lib/icons";
import { formatActivityTime } from "@/lib/formatters/date";

export interface ActivityEvent {
  id: number | string;
  type: "contract" | "incident";
  action: "created" | "updated" | "resolved" | "escalated";
  title: string;
  reference: string;
  timestamp: string;
  severity?: "low" | "medium" | "high" | "critical";
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  loading?: boolean;
}

const actionIcons = activityActionIconMap;

const typeLabels: Record<string, string> = {
  contract: "Contract",
  incident: "Incident",
};

const severityColors: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export default function ActivityFeed({ events, loading = false }: ActivityFeedProps) {
  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="px-0 text-left text-gray-500">No recent activities</div>;
  }

  return (
    <>
      {events.map((event, index) => {
        const icon = actionIcons[event.action];
        const typeLabel = typeLabels[event.type] || event.type;
        const severityColor = event.severity ? severityColors[event.severity] || "" : "";

        return (
          <div key={event.id || index} className="flex gap-4 p-4 rounded-sm bg-slate-100">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg">
                <MaterialIcon name={icon} className="text-slate-700" />
              </div>
            </div>

            <div className="flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-sm text-slate-800 mt-1">
                    <span className="inline-block bg-slate-300 text-slate-700 px-2 py-1 rounded-sm mr-2">
                      {typeLabel}
                    </span>
                    <span className={`inline-block ${severityColor}`}>{event.reference}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 mt-2">
                {formatActivityTime(event.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
