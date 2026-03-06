"use client";

import { useMemo, useState } from "react";
import type { FormSchema } from "@/lib/forms/types";
import SearchableSelect from "./SearchableSelect";

export type FormFieldType = "text" | "number" | "date" | "textarea" | "select";

export type FormField = {
  key: string;
  label: string;
  type?: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

type FormBuilderProps<T extends FormSchema = FormSchema> = {
  fields: FormField[];
  initialValues?: Partial<T>;
  submitLabel?: string;
  loading?: boolean;
  onSubmitAction: (values: T) => Promise<void> | void;
};

export default function FormBuilder<T extends FormSchema = FormSchema>({
  fields,
  initialValues,
  submitLabel = "Save",
  loading = false,
  onSubmitAction,
}: FormBuilderProps<T>) {
  const defaults = useMemo(() => {
    const base: Record<string, string> = fields.reduce(
      (acc, field) => {
        acc[field.key] = "";
        return acc;
      },
      {} as Record<string, string>
    );

    for (const [key, value] of Object.entries(initialValues ?? {})) {
      if (typeof value === "string") {
        base[key] = value;
      }
    }

    return base as T;
  }, [fields, initialValues]);

  const [values, setValues] = useState<T>(defaults);

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitAction(values);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 content-card"
    >
      {fields.map((field) => {
        const type = field.type ?? "text";
        const commonClass =
          "w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

        if (type === "textarea") {
          return (
            <label key={field.key} className="text-sm text-slate-700">
              <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
              <textarea
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.key] ?? "")}
                onChange={(e) => updateField(field.key, e.target.value)}
                className={commonClass}
                rows={4}
              />
            </label>
          );
        }

        if (type === "select") {
          return (
            <div key={field.key}>
              <SearchableSelect
                label={field.label}
                required={field.required}
                options={[
                  { id: 0, label: "Select...", value: "" },
                  ...(field.options ?? []).map((opt, idx) => ({
                    id: idx + 1,
                    label: opt.label,
                    value: opt.value,
                  })),
                ]}
                value={String(values[field.key] ?? "")}
                onChange={(val) => updateField(field.key, String(val))}
              />
            </div>
          );
        }

        return (
          <label key={field.key} className="text-sm text-slate-700">
            <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
            <input
              type={type}
              required={field.required}
              placeholder={field.placeholder}
              value={String(values[field.key] ?? "")}
              onChange={(e) => updateField(field.key, e.target.value)}
              className={commonClass}
            />
          </label>
        );
      })}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
