import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseAssetMaintenanceLogs = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/assets/useAssetMaintenanceLogs", () => ({
  useAssetMaintenanceLogs: mockUseAssetMaintenanceLogs,
}));

vi.mock("@/components/assets/detail/MaintenanceLogForm", () => ({
  default: (props: {
    isOpen: boolean;
    editing: { id: number } | null;
    loading: boolean;
    error: string | null;
    onCloseAction: () => void;
    onSubmitAction: (payload: unknown) => void;
  }) => (
    <div data-testid="maintenance-log-form">
      <span>form-open:{String(props.isOpen)}</span>
      <span>form-editing:{String(Boolean(props.editing))}</span>
      <span>form-loading:{String(props.loading)}</span>
      <span>form-error:{props.error ?? ""}</span>
      <button type="button" onClick={props.onCloseAction}>
        mock form close
      </button>
      <button
        type="button"
        onClick={() =>
          props.onSubmitAction({
            type: "preventive",
            description: "From mocked form",
          })
        }
      >
        mock form submit
      </button>
    </div>
  ),
}));

import AssetMaintenanceLogSection from "@/components/assets/detail/AssetMaintenanceLogSection";

function createLogHookState(overrides: Record<string, unknown> = {}) {
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
    editingLog: null,
    mutating: false,
    mutateError: null,
    openCreateForm: vi.fn(),
    openEditForm: vi.fn(),
    closeForm: vi.fn(),
    submitForm: vi.fn(),
    deleteLog: vi.fn(),
    ...overrides,
  };
}

describe("AssetMaintenanceLogSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAssetMaintenanceLogs.mockReturnValue(createLogHookState());
  });

  it("renders loading and empty/error states", () => {
    mockUseAssetMaintenanceLogs.mockReturnValueOnce(
      createLogHookState({
        loading: true,
      })
    );

    const { rerender } = render(<AssetMaintenanceLogSection assetId={1} canWrite />);

    expect(screen.getByText(/^Loading...$/i)).toBeInTheDocument();

    mockUseAssetMaintenanceLogs.mockReturnValueOnce(
      createLogHookState({
        error: "Failed to load logs",
      })
    );

    rerender(<AssetMaintenanceLogSection assetId={1} canWrite />);

    expect(screen.getByText(/Failed to load logs/i)).toBeInTheDocument();
    expect(screen.getByText(/No maintenance logs found/i)).toBeInTheDocument();
  });

  it("renders entries and wires create/edit/delete actions", async () => {
    const user = userEvent.setup();
    const openCreateForm = vi.fn();
    const openEditForm = vi.fn();
    const deleteLog = vi.fn();
    const log = {
      id: 21,
      asset_id: 1,
      performed_by: 2,
      performed_by_user: { id: 2, name: "Alice" },
      type: "preventive",
      description: "Quarterly maintenance",
      performed_at: "2026-03-10",
      hours_spent: 2,
      cost: 150,
    };

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    mockUseAssetMaintenanceLogs.mockReturnValue(
      createLogHookState({
        items: [log],
        openCreateForm,
        openEditForm,
        deleteLog,
      })
    );

    render(<AssetMaintenanceLogSection assetId={1} canWrite />);

    expect(screen.getByText(/Quarterly maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/2h/i)).toBeInTheDocument();
    expect(screen.getByText(/\$150.00/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Log maintenance/i }));
    await user.click(screen.getByRole("button", { name: /^Edit$/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(openCreateForm).toHaveBeenCalledTimes(1);
    expect(openEditForm).toHaveBeenCalledWith(log);
    expect(deleteLog).toHaveBeenCalledWith(21);

    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is canceled", async () => {
    const user = userEvent.setup();
    const deleteLog = vi.fn();

    vi.spyOn(window, "confirm").mockReturnValue(false);

    mockUseAssetMaintenanceLogs.mockReturnValue(
      createLogHookState({
        items: [
          {
            id: 30,
            asset_id: 1,
            performed_by: 2,
            type: "repair",
            description: "Emergency fix",
            performed_at: "2026-03-11",
          },
        ],
        deleteLog,
      })
    );

    render(<AssetMaintenanceLogSection assetId={1} canWrite />);

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(deleteLog).not.toHaveBeenCalled();
  });

  it("hides write actions in read-only mode", () => {
    mockUseAssetMaintenanceLogs.mockReturnValue(
      createLogHookState({
        items: [
          {
            id: 40,
            asset_id: 1,
            performed_by: 5,
            type: "inspection",
            description: "Inspection only",
            performed_at: "2026-03-12",
          },
        ],
      })
    );

    render(<AssetMaintenanceLogSection assetId={1} canWrite={false} />);

    expect(screen.queryByRole("button", { name: /Log maintenance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  it("forwards form wiring props and callbacks", async () => {
    const user = userEvent.setup();
    const closeForm = vi.fn();
    const submitForm = vi.fn();

    mockUseAssetMaintenanceLogs.mockReturnValue(
      createLogHookState({
        formOpen: true,
        editingLog: { id: 51 },
        mutating: true,
        mutateError: "Save failed",
        closeForm,
        submitForm,
      })
    );

    render(<AssetMaintenanceLogSection assetId={1} canWrite />);

    expect(screen.getByText(/form-open:true/i)).toBeInTheDocument();
    expect(screen.getByText(/form-editing:true/i)).toBeInTheDocument();
    expect(screen.getByText(/form-loading:true/i)).toBeInTheDocument();
    expect(screen.getByText(/form-error:Save failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mock form close/i }));
    await user.click(screen.getByRole("button", { name: /mock form submit/i }));

    expect(closeForm).toHaveBeenCalledTimes(1);
    expect(submitForm).toHaveBeenCalledWith(
      expect.objectContaining({ type: "preventive", description: "From mocked form" })
    );
  });
});

