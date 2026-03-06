import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/formatters/date", () => ({
  formatDateTimeOrDash: (v: string | null) => (v ? "2026-03-14 10:00" : "-"),
}));

import ReadModelsPanel from "@/components/dashboard/ReadModelsPanel";
import type { DashboardReadModels } from "@/lib/api";

const EMPTY_READ_MODELS: DashboardReadModels = {
  tables_available: false,
  projections: [],
  snapshots: [],
  projections_pagination: null,
  snapshots_pagination: null,
};

const LOADED_READ_MODELS: DashboardReadModels = {
  tables_available: true,
  projections: [
    {
      id: 1,
      projection_name: "contracts_projection",
      source_event_type: "contract.created",
      last_processed_event_id: 500,
      last_processed_version: 10,
      is_active: true,
      event_count: 243,
      last_event_type: "contract.updated",
      updated_at: "2026-03-14T10:00:00Z",
    },
    {
      id: 2,
      projection_name: "incidents_projection",
      source_event_type: "incident.created",
      last_processed_event_id: 120,
      last_processed_version: 3,
      is_active: false,
      event_count: 58,
      last_event_type: null,
      updated_at: null,
    },
  ],
  snapshots: [
    {
      id: 11,
      aggregate_type: "Contract",
      aggregate_id: 99,
      version: 7,
      created_at: "2026-03-14T09:00:00Z",
    },
  ],
  projections_pagination: { total: 2, per_page: 10, current_page: 1, last_page: 1 },
  snapshots_pagination: { total: 1, per_page: 10, current_page: 1, last_page: 1 },
};

const DEFAULT_PROPS = {
  onProjectionActiveFilterChangeAction: vi.fn(),
  onProjectionNameFilterChangeAction: vi.fn(),
  onProjectionsPageChangeAction: vi.fn(),
  onSnapshotAggregateFilterChangeAction: vi.fn(),
  onSnapshotsPageChangeAction: vi.fn(),
  projectionActiveFilter: "all" as const,
  projectionNameFilter: "",
  projectionsPage: 1,
  readModels: LOADED_READ_MODELS,
  readModelsError: null,
  snapshotAggregateFilter: "",
  snapshotsPage: 1,
  totalProjectionPages: 1,
  totalSnapshotPages: 1,
};

describe("ReadModelsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows unavailability notice when tables_available is false", () => {
    render(<ReadModelsPanel {...DEFAULT_PROPS} readModels={EMPTY_READ_MODELS} />);

    expect(screen.getByText(/currently unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dashboard Summaries/i)).not.toBeInTheDocument();
  });

  it("renders projections table with loaded data", () => {
    render(<ReadModelsPanel {...DEFAULT_PROPS} />);

    expect(screen.getByText("contracts_projection")).toBeInTheDocument();
    expect(screen.getByText("243")).toBeInTheDocument();
    // "Active" also appears as a select <option> – query by table cell role
    expect(screen.getAllByRole("cell", { name: "Active" })).toHaveLength(1);
    expect(screen.getByText("incidents_projection")).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "Inactive" })).toHaveLength(1);
  });

  it("shows empty state row when projections list is empty", () => {
    render(
      <ReadModelsPanel
        {...DEFAULT_PROPS}
        readModels={{ ...LOADED_READ_MODELS, projections: [] }}
      />
    );

    expect(screen.getByText(/no summaries match/i)).toBeInTheDocument();
  });

  it("renders snapshot table with loaded data", () => {
    render(<ReadModelsPanel {...DEFAULT_PROPS} />);

    expect(screen.getByText("Contract")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows empty state row when snapshots list is empty", () => {
    render(
      <ReadModelsPanel
        {...DEFAULT_PROPS}
        readModels={{ ...LOADED_READ_MODELS, snapshots: [] }}
      />
    );

    expect(screen.getByText(/no checkpoints match/i)).toBeInTheDocument();
  });

  it("displays read models error banner", () => {
    render(<ReadModelsPanel {...DEFAULT_PROPS} readModelsError="Failed to load read models." />);

    expect(screen.getByText("Failed to load read models.")).toBeInTheDocument();
  });

  it("forwards projection name filter change action", () => {
    const onProjectionNameFilterChangeAction = vi.fn();

    render(
      <ReadModelsPanel {...DEFAULT_PROPS} onProjectionNameFilterChangeAction={onProjectionNameFilterChangeAction} />
    );

    const input = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(input, { target: { value: "contracts" } });

    expect(onProjectionNameFilterChangeAction).toHaveBeenCalledWith("contracts");
  });

  it("forwards projection active filter change action", async () => {
    const user = userEvent.setup();
    const onProjectionActiveFilterChangeAction = vi.fn();

    render(
      <ReadModelsPanel {...DEFAULT_PROPS} onProjectionActiveFilterChangeAction={onProjectionActiveFilterChangeAction} />
    );

    await user.selectOptions(screen.getByRole("combobox"), "active");
    expect(onProjectionActiveFilterChangeAction).toHaveBeenCalledWith("active");
  });

  it("forwards snapshot aggregate filter change action", async () => {
    const user = userEvent.setup();
    const onSnapshotAggregateFilterChangeAction = vi.fn();

    render(
      <ReadModelsPanel {...DEFAULT_PROPS} onSnapshotAggregateFilterChangeAction={onSnapshotAggregateFilterChangeAction} />
    );

    const input = screen.getByPlaceholderText(/filter by record type/i);
    await user.type(input, "Contract");
    expect(onSnapshotAggregateFilterChangeAction).toHaveBeenCalled();
  });

  it("disables pagination buttons correctly on first/last page", () => {
    render(
      <ReadModelsPanel
        {...DEFAULT_PROPS}
        projectionsPage={1}
        totalProjectionPages={3}
        snapshotsPage={3}
        totalSnapshotPages={3}
      />
    );

    const allPrevButtons = screen.getAllByRole("button", { name: /prev/i });
    const allNextButtons = screen.getAllByRole("button", { name: /next/i });

    expect(allPrevButtons[0]).toBeDisabled();
    expect(allNextButtons[0]).toBeEnabled();

    expect(allPrevButtons[1]).toBeEnabled();
    expect(allNextButtons[1]).toBeDisabled();
  });
});

