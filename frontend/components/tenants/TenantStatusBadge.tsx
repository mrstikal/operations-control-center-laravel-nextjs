"use client";

import type { Tenant } from "@/lib/api/tenants";

type StatePresentation = {
  label: string;
  className: string;
};

function getTenantStatePresentation(tenant: Tenant): StatePresentation {
  if (tenant.deleted_at) {
    return {
      label: "Archived",
      className: "bg-red-100 text-red-800",
    };
  }

  switch (tenant.status) {
    case "active":
      return {
        label: "Active",
        className: "bg-green-100 text-green-800",
      };
    case "suspended":
      return {
        label: "Suspended",
        className: "bg-amber-100 text-amber-800",
      };
    case "inactive":
      return {
        label: "Inactive",
        className: "bg-slate-100 text-slate-700",
      };
    default:
      return {
        label: "Unknown",
        className: "bg-slate-100 text-slate-700",
      };
  }
}

export default function TenantStatusBadge({ tenant }: { tenant: Tenant }) {
  const statePresentation = getTenantStatePresentation(tenant);

  return (
    <span
      className={`inline-block rounded px-2 py-1 text-xs font-medium ${statePresentation.className}`}
    >
      {statePresentation.label}
    </span>
  );
}
