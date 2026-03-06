"use client";

import ActivityFeed from "@/components/ActivityFeed";
import type { DashboardEvent } from "@/lib/api";
import { mapStatusToSeverity } from "@/lib/dashboard/mappers";

type RecentActivitySectionProps = {
  events: DashboardEvent[];
  loading: boolean;
};

export default function RecentActivitySection({ events, loading }: RecentActivitySectionProps) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
      <div className="common-grid-4">
        <ActivityFeed
          events={events.map((event) => ({
            id: event.id,
            type: event.type,
            action: event.action,
            title: event.title,
            reference: event.reference,
            timestamp: event.timestamp,
            severity: mapStatusToSeverity(event.status),
          }))}
          loading={loading}
        />
      </div>
    </section>
  );
}
