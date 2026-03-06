"use client";

import type { Contract } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters/currency";

type BadgeInfo = {
  color: string;
  label: string;
};

const STATUS_INFO: Record<string, BadgeInfo> = {
  draft: { color: "bg-slate-600", label: "Draft" },
  approved: { color: "bg-blue-600", label: "Approved" },
  in_progress: { color: "bg-cyan-600", label: "In Progress" },
  blocked: { color: "bg-red-600", label: "Blocked" },
  done: { color: "bg-green-600", label: "Done" },
};

const PRIORITY_INFO: Record<string, BadgeInfo> = {
  low: { color: "bg-green-600", label: "Low" },
  medium: { color: "bg-yellow-600", label: "Medium" },
  high: { color: "bg-orange-600", label: "High" },
  critical: { color: "bg-red-600", label: "Critical" },
};

export default function ContractMetadataGrid({ contract }: { contract: Contract }) {
  const statusInfo = STATUS_INFO[contract.status] || {
    color: "bg-slate-600",
    label: contract.status,
  };
  const priorityInfo = PRIORITY_INFO[contract.priority] || {
    color: "bg-slate-600",
    label: contract.priority,
  };

  return (
    <div className="grid grid-cols-2 gap-4 rounded-sm border border-slate-200 bg-white p-6 md:grid-cols-4">
      <div>
        <div className="text-xs font-medium text-slate-500">Status</div>
        <div
          className={`mt-2 inline-block rounded-sm ${statusInfo.color} px-3 py-1 text-sm font-medium text-white`}
        >
          {statusInfo.label}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500">Priority</div>
        <div
          className={`mt-2 inline-block rounded-sm ${priorityInfo.color} px-3 py-1 text-sm font-medium text-white`}
        >
          {priorityInfo.label}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500">Budget</div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          {formatCurrency(contract.budget)}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500">Spent</div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          {formatCurrency(contract.spent)}
        </div>
      </div>
    </div>
  );
}
