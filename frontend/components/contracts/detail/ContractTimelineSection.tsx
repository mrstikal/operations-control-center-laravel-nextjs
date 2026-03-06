"use client";

import type { Contract } from "@/lib/types";
import { formatDateOrDash } from "@/lib/formatters/date";

export default function ContractTimelineSection({ contract }: { contract: Contract }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold">Timeline</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <div className="text-sm text-slate-600">Created</div>
          <div className="mt-1 font-medium text-slate-900">
            {formatDateOrDash(contract.created_at)}
          </div>
        </div>

        {contract.start_date && (
          <div>
            <div className="text-sm text-slate-600">Start Date</div>
            <div className="mt-1 font-medium text-slate-900">
              {formatDateOrDash(contract.start_date)}
            </div>
          </div>
        )}

        {contract.due_date && (
          <div>
            <div className="text-sm text-slate-600">Due Date</div>
            <div className="mt-1 font-medium text-slate-900">
              {formatDateOrDash(contract.due_date)}
            </div>
          </div>
        )}

        {contract.completed_at && (
          <div>
            <div className="text-sm text-slate-600">Completed</div>
            <div className="mt-1 font-medium text-slate-900">
              {formatDateOrDash(contract.completed_at)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
