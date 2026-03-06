"use client";

export default function DashboardSkeleton() {
  return (
    <section
      aria-label="Dashboard loading"
      aria-busy="true"
      className="space-y-6"
      data-testid="dashboard-skeleton"
    >
      <span className="sr-only">Loading dashboard</span>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card animate-pulse">
            <div className="h-4 w-24 rounded bg-slate-700/70" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-600/70" />
            <div className="mt-4 h-3 w-32 rounded bg-slate-700/60" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card animate-pulse xl:col-span-2">
          <div className="h-5 w-40 rounded bg-slate-700/70" />
          <div className="mt-4 space-y-3">
            <div className="h-3 rounded bg-slate-700/60" />
            <div className="h-3 w-11/12 rounded bg-slate-700/60" />
            <div className="h-3 w-9/12 rounded bg-slate-700/60" />
          </div>
        </div>

        <div className="card animate-pulse">
          <div className="h-5 w-32 rounded bg-slate-700/70" />
          <div className="mt-4 space-y-3">
            <div className="h-3 rounded bg-slate-700/60" />
            <div className="h-3 rounded bg-slate-700/60" />
            <div className="h-3 w-8/12 rounded bg-slate-700/60" />
          </div>
        </div>
      </div>

      <div className="card animate-pulse">
        <div className="h-5 w-36 rounded bg-slate-700/70" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded bg-slate-700/60" />
          <div className="h-10 rounded bg-slate-700/60" />
          <div className="h-10 rounded bg-slate-700/60" />
        </div>
      </div>
    </section>
  );
}

