"use client";

export default function AssetDescriptionCard({ description }: { description?: string }) {
  if (!description) {
    return null;
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold">Description</h2>
      <p className="text-slate-700">{description}</p>
    </div>
  );
}
