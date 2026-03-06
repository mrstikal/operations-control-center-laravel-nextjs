"use client";

import type { Asset } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function AssetDetailsCard({ asset }: { asset: Asset }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Details</h2>
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {asset.manufacturer && (
          <>
            <dt className="text-sm font-medium text-slate-600">Manufacturer</dt>
            <dd className="text-sm text-slate-900">{asset.manufacturer}</dd>
          </>
        )}
        {asset.model && (
          <>
            <dt className="text-sm font-medium text-slate-600">Model</dt>
            <dd className="text-sm text-slate-900">{asset.model}</dd>
          </>
        )}
        {asset.acquisition_date && (
          <>
            <dt className="text-sm font-medium text-slate-600">Acquisition Date</dt>
            <dd className="text-sm text-slate-900">{formatDateOrDash(asset.acquisition_date)}</dd>
          </>
        )}
        {asset.warranty_expiry && (
          <>
            <dt className="text-sm font-medium text-slate-600">Warranty Expiry</dt>
            <dd className="text-sm text-slate-900">{formatDateOrDash(asset.warranty_expiry)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
