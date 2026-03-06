"use client";

import type { Asset } from "@/lib/types";

function getStatusColor(asset: Asset) {
  if (asset.deleted_at) {
    return "bg-zinc-600";
  }

  switch (asset.status) {
    case "operational":
      return "bg-green-600";
    case "maintenance":
      return "bg-yellow-600";
    case "repair":
      return "bg-orange-600";
    default:
      return "bg-slate-600";
  }
}

function getCategoryLabel(asset: Asset) {
  if (!asset.category) {
    return "—";
  }

  if (typeof asset.category === "string") {
    return asset.category;
  }

  return asset.category.name;
}

export default function AssetOverviewGrid({ asset }: { asset: Asset }) {
  const statusColor = getStatusColor(asset);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <div className="content-card">
        <div className="text-xs text-slate-600">Status</div>
        <div className="mt-1">
          <span className={`status-badge ${statusColor}`}>
            {asset.deleted_at ? "deleted" : asset.status}
          </span>
        </div>
      </div>

      <div className="content-card">
        <div className="text-xs text-slate-600">Assigned To</div>
        <div className="mt-1 font-medium">{asset.assigned_to?.name || "Unassigned"}</div>
      </div>

      <div className="content-card">
        <div className="text-xs text-slate-600">Category</div>
        <div className="mt-1 font-medium">{getCategoryLabel(asset)}</div>
      </div>

      <div className="content-card">
        <div className="text-xs text-slate-600">Location</div>
        <div className="mt-1 font-medium">{asset.location || "—"}</div>
      </div>

      <div className="content-card">
        <div className="text-xs text-slate-600">Serial Number</div>
        <div className="mt-1 font-medium">{asset.serial_number || "—"}</div>
      </div>
    </div>
  );
}
