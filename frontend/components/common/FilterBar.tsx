"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterSchema } from "@/lib/forms/types";
import SearchableSelect from "./SearchableSelect";

export type FilterType = "text" | "select" | "date";

export type FilterField = {
  key: string;
  label: string;
  type?: FilterType;
  options?: Array<{ label: string; value: string; muted?: boolean }>;
  placeholder?: string;
};

type FilterBarProps<TSchema extends FilterSchema = FilterSchema> = {
  fields: FilterField[];
  onChangeAction: (filters: TSchema) => void;
  className?: string;
  initialValues?: Partial<TSchema>;
};

export default function FilterBar<TSchema extends FilterSchema = FilterSchema>({
  fields,
  onChangeAction,
  className,
  initialValues,
}: FilterBarProps<TSchema>) {
  const fieldKeysSignature = useMemo(() => fields.map((field) => field.key).join("|"), [fields]);
  const fieldKeys = useMemo(
    () => (fieldKeysSignature ? fieldKeysSignature.split("|") : []),
    [fieldKeysSignature]
  );

  const initial = useMemo(() => {
    const base = fieldKeys.reduce<TSchema>((acc, key) => {
      acc[key as keyof TSchema] = "" as TSchema[keyof TSchema];
      return acc;
    }, {} as TSchema);

    return {
      ...base,
      ...(initialValues ?? {}),
    } as TSchema;
  }, [fieldKeys, initialValues]);

  const [filters, setFilters] = useState<TSchema>(initial);

  useEffect(() => {
    setFilters(initial);
  }, [initial]);

  function updateFilter(key: string, value: string) {
    const next = { ...filters, [key]: value } as TSchema;
    setFilters(next);
    onChangeAction(next);
  }

  function resetFilters() {
    setFilters(initial);
    onChangeAction(initial);
  }

  return (
    <div className={`content-card ${className ?? ""}`}>
      <div className="flex flex-wrap gap-3">
        {fields.map((field) => {
          const type = field.type ?? "text";

          if (type === "select") {
            return (
              <div key={field.key}>
                <SearchableSelect
                  label={field.label}
                  options={[
                    { id: 0, label: "All", value: "" },
                    ...(field.options ?? []).map((opt, idx) => ({
                      id: idx + 1,
                      label: opt.label,
                      value: opt.value,
                      muted: opt.muted,
                    })),
                  ]}
                  value={filters[field.key] ?? ""}
                  onChange={(val) => updateFilter(field.key, String(val))}
                  placeholder="All"
                />
              </div>
            );
          }

          return (
            <label key={field.key} className="text-sm text-slate-700">
              <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
              <input
                type={type}
                value={filters[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(e) => updateFilter(field.key, e.target.value)}
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex justify-start">
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
