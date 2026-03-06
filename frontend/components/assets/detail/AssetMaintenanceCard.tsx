"use client";

import type { Asset } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function AssetMaintenanceCard({ asset }: { asset: Asset }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Maintenance</h2>
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {asset.last_maintenance && (
          <>
            <dt className="text-sm font-medium text-slate-600">Last Maintenance</dt>
            <dd className="text-sm text-slate-900">{formatDateOrDash(asset.last_maintenance)}</dd>
          </>
        )}
        {asset.next_maintenance && (
          <>
            <dt className="text-sm font-medium text-slate-600">Next Maintenance</dt>
            <dd className="text-sm text-slate-900">{formatDateOrDash(asset.next_maintenance)}</dd>
          </>
        )}
        {asset.maintenance_interval_days && (
          <>
            <dt className="text-sm font-medium text-slate-600">Maintenance Interval</dt>
            <dd className="text-sm text-slate-900">{asset.maintenance_interval_days} days</dd>
          </>
        )}
      </dl>
    </div>
  );
}
