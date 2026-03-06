"use client";

import KPICard from "@/components/KPICard";
import { kpiIconMap } from "@/lib/icons";
import type { UiKpis } from "@/lib/dashboard/types";

type OperationalMetricsSectionProps = {
  kpis: UiKpis;
};

export default function OperationalMetricsSection({ kpis }: OperationalMetricsSectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Operational Metrics</h2>
      <div className="common-grid-4">
        <KPICard
          label="Total contracts"
          value={kpis.contracts_total}
          color="blue"
          icon={kpiIconMap.contracts_total}
        />
        <KPICard
          label="Finished"
          value={kpis.contracts_done}
          color="green"
          icon={kpiIconMap.contracts_done}
        />
        <KPICard
          label="In progress"
          value={kpis.contracts_in_progress}
          color="orange"
          icon={kpiIconMap.contracts_in_progress}
        />
        <KPICard
          label="After deadline"
          value={kpis.contracts_overdue}
          color="red"
          icon={kpiIconMap.contracts_overdue}
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mt-6">
        <KPICard
          label="Total incidents"
          value={kpis.incidents_total}
          color="purple"
          icon={kpiIconMap.incidents_total}
        />
        <KPICard
          label="Open"
          value={kpis.incidents_open}
          color="orange"
          icon={kpiIconMap.incidents_open}
        />
        <KPICard
          label="Escalated"
          value={kpis.incidents_escalated}
          color="red"
          icon={kpiIconMap.incidents_escalated}
        />
        <KPICard
          label="SLA breach"
          value={kpis.incidents_sla_breached}
          color="red"
          icon={kpiIconMap.incidents_sla_breached}
        />
      </div>
    </section>
  );
}
