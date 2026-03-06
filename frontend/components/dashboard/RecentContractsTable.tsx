"use client";

import type { Contract } from "@/lib/api";

type RecentContractsTableProps = {
  contracts: Contract[];
};

export default function RecentContractsTable({ contracts }: RecentContractsTableProps) {
  return (
    <div className="dashboard-card">
      <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>State</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id}>
              <td>{contract.contract_number}</td>
              <td>{contract.title}</td>
              <td>
                <span className="badge">{contract.status}</span>
              </td>
              <td>{contract.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
