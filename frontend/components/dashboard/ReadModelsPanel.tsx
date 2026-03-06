"use client";

import type { DashboardReadModels } from "@/lib/api";
import type { ProjectionActiveFilter } from "@/lib/dashboard/types";
import { formatDateTimeOrDash } from "@/lib/formatters/date";

type ReadModelsPanelProps = {
  onProjectionActiveFilterChangeAction: (value: ProjectionActiveFilter) => void;
  onProjectionNameFilterChangeAction: (value: string) => void;
  onProjectionsPageChangeAction: (page: number | ((page: number) => number)) => void;
  onSnapshotAggregateFilterChangeAction: (value: string) => void;
  onSnapshotsPageChangeAction: (page: number | ((page: number) => number)) => void;
  projectionActiveFilter: ProjectionActiveFilter;
  projectionNameFilter: string;
  projectionsPage: number;
  readModels: DashboardReadModels;
  readModelsError: string | null;
  snapshotAggregateFilter: string;
  snapshotsPage: number;
  totalProjectionPages: number;
  totalSnapshotPages: number;
};

function ReadModelPagination({
  currentPage,
  disabledNext,
  disabledPrev,
  onNext,
  onPrev,
  totalPages,
}: {
  currentPage: number;
  disabledNext: boolean;
  disabledPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <span>
        Page {currentPage} / {totalPages}
      </span>
      <div className="flex gap-2">
        <button className="btn btn-secondary" disabled={disabledPrev} onClick={onPrev}>
          Prev
        </button>
        <button className="btn btn-secondary" disabled={disabledNext} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}

export default function ReadModelsPanel({
  onProjectionActiveFilterChangeAction,
  onProjectionNameFilterChangeAction,
  onProjectionsPageChangeAction,
  onSnapshotAggregateFilterChangeAction,
  onSnapshotsPageChangeAction,
  projectionActiveFilter,
  projectionNameFilter,
  projectionsPage,
  readModels,
  readModelsError,
  snapshotAggregateFilter,
  snapshotsPage,
  totalProjectionPages,
  totalSnapshotPages,
}: ReadModelsPanelProps) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-2">Live Data Overview</h2>
      <p className="text-sm text-gray-600 mb-6">
        Shows how up-to-date the numbers on this dashboard are. Every time you or your team{" "}
        <strong>creates, updates or changes the status</strong> of a contract, incident or asset,
        the system automatically records that change and refreshes the summaries below. If a row is
        active and recently updated, the numbers you see above reflect the current state of your
        operations.
      </p>

      {readModelsError && <div className="card text-red-400 mb-4">{readModelsError}</div>}

      {!readModels.tables_available ? (
        <div className="card">
          Live data overview is currently unavailable. Please try again later.
        </div>
      ) : (
        <div>
          <div className="dashboard-card">
            <h3 className="text-xl font-bold mb-1">Dashboard Summaries</h3>
            <p className="text-sm text-gray-600 mb-4">
              Each row is one summary block on this dashboard — you can see its name, how many
              changes it has processed, and when it was last refreshed. A summary updates
              automatically whenever a contract or incident is{" "}
              <strong>created, edited, or its status changes</strong>.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                className="text-sm w-full border border-slate-300 px-3 py-2"
                placeholder="Search by name"
                value={projectionNameFilter}
                onChange={(event) => onProjectionNameFilterChangeAction(event.target.value)}
              />
              <select
                className="text-sm w-full border border-slate-300 px-3 py-2 bg-white rounded-sm"
                value={projectionActiveFilter}
                onChange={(event) =>
                  onProjectionActiveFilterChangeAction(event.target.value as ProjectionActiveFilter)
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Changes processed</th>
                  <th>Last change type</th>
                  <th>Status</th>
                  <th>Last refreshed</th>
                </tr>
              </thead>
              <tbody>
                {readModels.projections.length === 0 && (
                  <tr>
                    <td colSpan={5}>No summaries match your search.</td>
                  </tr>
                )}
                {readModels.projections.map((projection) => (
                  <tr key={projection.id}>
                    <td>{projection.projection_name}</td>
                    <td>{projection.event_count}</td>
                    <td>{projection.last_event_type ?? "-"}</td>
                    <td>{projection.is_active ? "Active" : "Inactive"}</td>
                    <td>{formatDateTimeOrDash(projection.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ReadModelPagination
              currentPage={projectionsPage}
              totalPages={totalProjectionPages}
              disabledPrev={projectionsPage <= 1}
              disabledNext={projectionsPage >= totalProjectionPages}
              onPrev={() => onProjectionsPageChangeAction((page) => Math.max(1, page - 1))}
              onNext={() =>
                onProjectionsPageChangeAction((page) => Math.min(totalProjectionPages, page + 1))
              }
            />
          </div>

          <div className="dashboard-card mt-4">
            <h3 className="text-xl font-bold mb-1">Saved Checkpoints</h3>
            <p className="text-sm text-gray-600 mb-4">
              A checkpoint is saved automatically each time a contract, incident or asset reaches a
              new version — for example when its status changes or key details are updated. If the
              system ever needs to recover, it loads the nearest checkpoint instead of replaying
              every individual change from the beginning.
            </p>
            <div className="mb-4">
              <input
                className="text-sm w-full border border-slate-300 px-3 py-2"
                placeholder="Filter by record type (e.g. Contract)"
                value={snapshotAggregateFilter}
                onChange={(event) => onSnapshotAggregateFilterChangeAction(event.target.value)}
              />
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Record type</th>
                  <th>Record ID</th>
                  <th>Checkpoint #</th>
                  <th>Saved at</th>
                </tr>
              </thead>
              <tbody>
                {readModels.snapshots.length === 0 && (
                  <tr>
                    <td colSpan={4}>No checkpoints match your filter.</td>
                  </tr>
                )}
                {readModels.snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>{snapshot.aggregate_type}</td>
                    <td>{snapshot.aggregate_id}</td>
                    <td>{snapshot.version}</td>
                    <td>{formatDateTimeOrDash(snapshot.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ReadModelPagination
              currentPage={snapshotsPage}
              totalPages={totalSnapshotPages}
              disabledPrev={snapshotsPage <= 1}
              disabledNext={snapshotsPage >= totalSnapshotPages}
              onPrev={() => onSnapshotsPageChangeAction((page) => Math.max(1, page - 1))}
              onNext={() =>
                onSnapshotsPageChangeAction((page) => Math.min(totalSnapshotPages, page + 1))
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
