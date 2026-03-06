"use client";

import type { Contract } from "@/lib/types";

type ContractHeaderProps = {
  contract: Contract;
};

export default function ContractHeader({ contract }: ContractHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{contract.title}</h1>
        {!!contract.deleted_at && (
          <span className="status-badge bg-zinc-600">
            Deleted
          </span>
        )}
      </div>
      <p className="mt-2 text-slate-600">Contract #{contract.contract_number}</p>
    </div>
  );
}
