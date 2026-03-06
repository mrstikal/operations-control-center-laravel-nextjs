"use client";

export default function ContractDescriptionCard({ description }: { description?: string | null }) {
  if (!description) {
    return null;
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold">Description</h3>
      <p className="mt-3 text-slate-700">{description}</p>
    </div>
  );
}
