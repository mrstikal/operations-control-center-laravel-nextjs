"use client";

import { formatCurrency } from "@/lib/formatters/currency";
import { formatPercent } from "@/lib/formatters/number";

type ContractBudgetProgressProps = {
  budget?: number | null;
  spent?: number | null;
};

export default function ContractBudgetProgress({ budget, spent }: ContractBudgetProgressProps) {
  if (budget == null || spent == null || Number(budget) === 0) {
    return null;
  }

  const percentage = (Number(spent) / Number(budget)) * 100;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold">Budget Usage</h3>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Used</span>
          <span>
            {formatCurrency(spent)} / {formatCurrency(budget)} ({formatPercent(percentage)})
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-200">
          <div
            className={`h-full ${Number(spent) / Number(budget) > 0.8 ? "bg-red-600" : "bg-blue-600"}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
