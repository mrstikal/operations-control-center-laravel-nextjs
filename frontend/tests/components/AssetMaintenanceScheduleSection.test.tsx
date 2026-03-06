import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseAssetMaintenanceSchedules = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/assets/useAssetMaintenanceSchedules", () => ({
  useAssetMaintenanceSchedules: mockUseAssetMaintenanceSchedules,
}));

vi.mock("@/components/assets/detail/MaintenanceScheduleForm", () => ({
  default: (props: {
    isOpen: boolean;
    editing: { id: number } | null;
    loading: boolean;
    error: string | null;
    onCloseAction: () => void;
    onSubmitAction: (payload: unknown) => void;
  }) => (
    <div data-testid="maintenance-schedule-form">
      <span>schedule-form-open:{String(props.isOpen)}</span>
      <span>schedule-form-editing:{String(Boolean(props.editing))}</span>
      <span>schedule-form-loading:{String(props.loading)}</span>
      <span>schedule-form-error:{props.error ?? ""}</span>
      <button type="button" onClick={props.onCloseAction}>
        mock schedule close
      </button>
      <button
        type="button"
        onClick={() =>
          props.onSubmitAction({
            frequency: "weekly",
            description: "From mocked schedule form",
          })
        }
      >
        mock schedule submit
      </button>
    </div>
  ),
}));

import AssetMaintenanceScheduleSection from "@/components/assets/detail/AssetMaintenanceScheduleSection";

function createScheduleHookState(overrides: Record<string, unknown> = {}) {
  return {
    items: [],
    loading: false,
    error: null,
    pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
    page: 1,
    perPage: 10,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChange: vi.fn(),
    formOpen: false,
    editingSchedule: null,
    mutating: false,
    mutateError: null,
    openCreateForm: vi.fn(),
    openEditForm: vi.fn(),
    closeForm: vi.fn(),
    submitForm: vi.fn(),
    deleteSchedule: vi.fn(),
    ...overrides,
  };
}

describe("AssetMaintenanceScheduleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAssetMaintenanceSchedules.mockReturnValue(createScheduleHookState());
  });

  it("renders loading and empty/error states", () => {
    mockUseAssetMaintenanceSchedules.mockReturnValueOnce(
      createScheduleHookState({
        loading: true,
      })
    );

    const { rerender } = render(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    expect(screen.getByText(/^Loading...$/i)).toBeInTheDocument();

    mockUseAssetMaintenanceSchedules.mockReturnValueOnce(
      createScheduleHookState({
        error: "Failed to load schedules",
      })
    );

    rerender(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    expect(screen.getByText(/Failed to load schedules/i)).toBeInTheDocument();
    expect(screen.getByText(/No maintenance schedules configured/i)).toBeInTheDocument();
  });

  it("renders due-state branches, counts and list values", async () => {
    const user = userEvent.setup();
    const openCreateForm = vi.fn();
    const items = [
      {
        id: 1,
        asset_id: 1,
        frequency: "monthly",
        interval_days: 30,
        description: "Critical patch cycle",
        next_due_date: "2026-03-01",
        due_state: "overdue",
        days_until_due: -3,
        is_active: true,
      },
      {
        id: 2,
        asset_id: 1,
        frequency: "weekly",
        description: "Cooling inspection",
        next_due_date: "2026-03-20",
        due_state: "due_soon",
        days_until_due: 2,
        is_active: true,
      },
      {
        id: 3,
        asset_id: 1,
        frequency: "yearly",
        description: "Warranty check",
        next_due_date: "2026-10-01",
        due_state: "ok",
        days_until_due: 120,
        is_active: false,
      },
    ];

    mockUseAssetMaintenanceSchedules.mockReturnValue(
      createScheduleHookState({
        items,
        openCreateForm,
      })
    );

    render(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    expect(screen.getByText(/1 overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/1 due soon/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Overdue$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Due soon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^OK$/i)).toBeInTheDocument();
    expect(screen.getByText(/Cooling inspection/i)).toBeInTheDocument();
    expect(screen.getByText(/2d/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Yes/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/No/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add schedule/i }));
    expect(openCreateForm).toHaveBeenCalledTimes(1);
  });

  it("wires edit/delete actions and respects delete confirmation", async () => {
    const user = userEvent.setup();
    const openEditForm = vi.fn();
    const deleteSchedule = vi.fn();
    const schedule = {
      id: 5,
      asset_id: 1,
      frequency: "custom",
      interval_days: 45,
      description: "Generator service",
      next_due_date: "2026-04-15",
      due_state: "ok",
      days_until_due: 10,
      is_active: true,
    };

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    mockUseAssetMaintenanceSchedules.mockReturnValue(
      createScheduleHookState({
        items: [schedule],
        openEditForm,
        deleteSchedule,
      })
    );

    const { rerender } = render(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    await user.click(screen.getByRole("button", { name: /^Edit$/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(openEditForm).toHaveBeenCalledWith(schedule);
    expect(deleteSchedule).toHaveBeenCalledWith(5);

    confirmSpy.mockReturnValue(false);
    rerender(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(deleteSchedule).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it("hides write actions when canWrite is false", () => {
    mockUseAssetMaintenanceSchedules.mockReturnValue(
      createScheduleHookState({
        items: [
          {
            id: 7,
            asset_id: 1,
            frequency: "monthly",
            description: "Read only",
            next_due_date: "2026-04-01",
            due_state: "ok",
            is_active: true,
          },
        ],
      })
    );

    render(<AssetMaintenanceScheduleSection assetId={1} canWrite={false} />);

    expect(screen.queryByRole("button", { name: /Add schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  it("forwards form wiring props and callbacks", async () => {
    const user = userEvent.setup();
    const closeForm = vi.fn();
    const submitForm = vi.fn();

    mockUseAssetMaintenanceSchedules.mockReturnValue(
      createScheduleHookState({
        formOpen: true,
        editingSchedule: { id: 33 },
        mutating: true,
        mutateError: "Save failed",
        closeForm,
        submitForm,
      })
    );

    render(<AssetMaintenanceScheduleSection assetId={1} canWrite />);

    expect(screen.getByText(/schedule-form-open:true/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule-form-editing:true/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule-form-loading:true/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule-form-error:Save failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mock schedule close/i }));
    await user.click(screen.getByRole("button", { name: /mock schedule submit/i }));

    expect(closeForm).toHaveBeenCalledTimes(1);
    expect(submitForm).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: "weekly", description: "From mocked schedule form" })
    );
  });
});



