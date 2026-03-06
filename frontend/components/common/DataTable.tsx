"use client";

import React from "react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

export type DataTableAction<T> = {
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  isVisible?: (row: T) => boolean;
  isDisabled?: (row: T) => boolean;
  disabledReason?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  loading?: boolean;
  emptyText?: string;
  rowKey: (row: T, index: number) => string | number;
  sort?: string;
  onSortChange?: (sort: string) => void;
};

function parseSort(sort?: string): { key: string; direction: "asc" | "desc" } | null {
  if (!sort) return null;
  const [key, directionRaw] = sort.split(":");
  if (!key) return null;
  const direction = directionRaw === "desc" ? "desc" : "asc";

  return { key, direction };
}

export default function DataTable<T>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyText = "No data.",
  rowKey,
  sort,
  onSortChange,
}: DataTableProps<T>) {
  const parsedSort = parseSort(sort);

  function handleSortClick(columnKey: string): void {
    if (!onSortChange) return;

    if (!parsedSort || parsedSort.key !== columnKey) {
      onSortChange(`${columnKey}:asc`);
      return;
    }

    onSortChange(`${columnKey}:${parsedSort.direction === "asc" ? "desc" : "asc"}`);
  }

  if (loading) {
    return (
      <div className="content-card text-slate-600">
        Loading...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="content-card text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {columns.map((column) => {
              const columnKey = String(column.key);
              const isSorted = parsedSort?.key === columnKey;

              return (
                <th
                  key={columnKey}
                  className={`px-4 py-3 text-left font-medium ${column.className ?? ""}`}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(columnKey)}
                      className="no-bg inline-flex items-center gap-1 text-left hover:text-slate-900"
                    >
                      <span>{column.label}</span>
                      <span className={`text-xs ${isSorted ? "text-slate-600" : "text-slate-900"}`}>
                        {isSorted ? (parsedSort?.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
            {actions.length > 0 && <th className="px-4 py-3 text-right font-medium">Actions</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-900">
          {data.map((row, index) => (
            <tr key={rowKey(row, index)} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td key={String(column.key)} className={`px-4 py-3 ${column.className ?? ""}`}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[String(column.key)] ?? "")}
                </td>
              ))}

              {actions.length > 0 && (
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {actions
                      .filter((action) => (action.isVisible ? action.isVisible(row) : true))
                      .map((action) => {
                        const disabled = action.isDisabled ? action.isDisabled(row) : false;

                        return (
                          <button
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            disabled={disabled}
                            title={disabled ? action.disabledReason : undefined}
                            className={
                              action.variant === "danger"
                                ? "rounded-sm bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                : "rounded-sm bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            }
                          >
                            {action.label}
                          </button>
                        );
                      })}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
