"use client";

import { useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import FilterBar from "@/components/common/FilterBar";
import FormBuilder from "@/components/common/FormBuilder";
import { useToast } from "@/lib/hooks/useToast";

type DemoRow = {
  id: number;
  title: string;
  status: string;
};

const MOCK_DATA: DemoRow[] = [
  { id: 1, title: "Contract A", status: "active" },
  { id: 2, title: "Contract B", status: "pending" },
  { id: 3, title: "Contract C", status: "done" },
];

const COLUMNS: DataTableColumn<DemoRow>[] = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
];

export default function Phase1DevPage() {
  const { infoAction } = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({ status: "" });
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(null);

  const filtered = MOCK_DATA.filter((item) => {
    if (!filters.status) return true;
    return item.status === filters.status;
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Phase 1 Dev Harness</h1>

      <FilterBar
        fields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Pending", value: "pending" },
              { label: "Done", value: "done" },
            ],
          },
        ]}
        onChangeAction={setFilters}
      />

      <DataTable
        data={filtered}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        actions={[{ label: "Details", onClick: (row) => infoAction(`Details #${row.id}`) }]}
      />

      <FormBuilder
        fields={[
          { key: "title", label: "Title", required: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { label: "Active", value: "active" },
              { label: "Pending", value: "pending" },
              { label: "Done", value: "done" },
            ],
          },
        ]}
        submitLabel="Save demo"
        onSubmitAction={(values) => setSubmitted(values as Record<string, string>)}
      />

      {submitted && (
        <pre className="rounded-sm border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {JSON.stringify(submitted, null, 2)}
        </pre>
      )}
    </main>
  );
}
