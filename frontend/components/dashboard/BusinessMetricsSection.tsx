"use client";

import KPICard from "@/components/KPICard";
import { kpiIconMap } from "@/lib/icons";
import type { UiKpis } from "@/lib/dashboard/types";

type BusinessMetricsSectionProps = {
  kpis: UiKpis;
};

export default function BusinessMetricsSection({ kpis }: BusinessMetricsSectionProps) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Business Metrics</h2>
      <div className="common-grid-3">
        <KPICard
          label="Budget utilization"
          value={kpis.budget_usage_percent}
          isPercentage
          color="green"
          icon={kpiIconMap.budget_usage_percent}
        />
        <KPICard
          label="Value of active orders"
          value={kpis.active_contracts_value}
          isCurrency
          color="blue"
          icon={kpiIconMap.active_contracts_value}
        />
        <KPICard
          label="Average incident resolution time"
          value={kpis.avg_incident_resolution_hours}
          unit="h"
          color="purple"
          icon={kpiIconMap.avg_incident_resolution_hours}
        />
      </div>
    </section>
  );
}
