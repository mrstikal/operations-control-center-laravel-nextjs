"use client";

import type { Asset } from "@/lib/types";

export default function AssetHeader({ asset }: { asset: Asset }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{asset.name}</h1>
        {!!asset.deleted_at && (
          <span className="status-badge bg-zinc-600">
            Deleted
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600">Asset #{asset.asset_tag || asset.id}</p>
    </div>
  );
}
