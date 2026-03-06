import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mockUseNotificationScheduleManagement = vi.hoisted(() => vi.fn());
const mockUseNotificationScheduleForm = vi.hoisted(() => vi.fn());

const viewCreatePageAction = vi.hoisted(() => vi.fn());
const viewEditPageAction = vi.hoisted(() => vi.fn());
const deleteScheduleAction = vi.hoisted(() => vi.fn());
const submitAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const cancelAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "12" }),
}));

vi.mock("@/hooks/notifications/useNotificationScheduleManagement", () => ({
  useNotificationScheduleManagement: mockUseNotificationScheduleManagement,
}));

vi.mock("@/hooks/notifications/useNotificationScheduleForm", () => ({
  useNotificationScheduleForm: mockUseNotificationScheduleForm,
}));

vi.mock("@/components/common/FilterBar", () => ({
  default: () => <div data-testid="filter-bar" />,
}));

vi.mock("@/components/common/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock("@/components/common/DataTable", () => ({
  default: ({ data, actions }: { data: Array<{ id: number; name: string; read?: boolean }>; actions: Array<{ label: string; onClick: (row: { id: number; name: string; read?: boolean }) => void; isVisible?: (row: { id: number; name: string; read?: boolean }) => boolean }> }) => (
    <div>
      {data.map((row) => (
        <div key={row.id}>
          <span>{row.name}</span>
          {actions
            .filter((action) => (action.isVisible ? action.isVisible(row) : true))
            .map((action) => (
              <button key={`${row.id}-${action.label}`} onClick={() => action.onClick(row)}>
                {action.label}
              </button>
            ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/notifications/NotificationScheduleForm", () => ({
  default: ({ title, onSubmitAction, onCancelAction }: { title: string; onSubmitAction: () => void; onCancelAction: () => void; children?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onSubmitAction}>Submit</button>
      <button onClick={onCancelAction}>Cancel</button>
    </div>
  ),
}));

import NotificationSchedulesPage from "@/app/notification-schedules/page";
import CreateNotificationSchedulePage from "@/app/notification-schedules/create/page";
import EditNotificationSchedulePage from "@/app/notification-schedules/[id]/edit/page";

function createManagementState(overrides: Record<string, unknown> = {}) {
  return {
    schedules: [{ id: 7, name: "SLA breach", is_active: true }],
    loading: false,
    deletingId: null,
    page: 1,
    perPage: 20,
    pagination: { total: 1, per_page: 20, current_page: 1, last_page: 1 },
    isReadOnly: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    handleFilterChangeAction: vi.fn(),
    viewCreatePageAction,
    viewEditPageAction,
    deleteScheduleAction,
    ...overrides,
  };
}

describe("Notification schedules routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseNotificationScheduleManagement.mockReturnValue(createManagementState());

    mockUseNotificationScheduleForm.mockReturnValue({
      loading: false,
      submitting: false,
      error: null,
      isReadOnly: false,
      name: "Schedule",
      notificationType: "incident_assigned",
      trigger: "incident_assigned",
      isActive: true,
      selectedRoles: ["Manager"],
      dedupeTtlMinutes: 30,
      advancedMode: false,
      conditionsJson: "",
      recipientsJson: "{}",
      setName: vi.fn(),
      setNotificationType: vi.fn(),
      setTrigger: vi.fn(),
      setIsActive: vi.fn(),
      setSelectedRoles: vi.fn(),
      setDedupeTtlMinutes: vi.fn(),
      setAdvancedMode: vi.fn(),
      setConditionsJson: vi.fn(),
      setRecipientsJson: vi.fn(),
      submitAction,
      cancelAction,
    });
  });

  it("list route renders and triggers create/edit/delete actions", async () => {
    const user = userEvent.setup();
    render(<NotificationSchedulesPage />);

    expect(screen.getByRole("heading", { name: /Notification schedules/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /New schedule/i }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(viewCreatePageAction).toHaveBeenCalledTimes(1);
    expect(viewEditPageAction).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(deleteScheduleAction).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it("list route blocks create button in read-only mode", () => {
    mockUseNotificationScheduleManagement.mockReturnValue(
      createManagementState({ schedules: [], isReadOnly: true })
    );

    render(<NotificationSchedulesPage />);

    expect(screen.getByRole("button", { name: /New schedule/i })).toBeDisabled();
  });

  it("create route wires submit and cancel actions", async () => {
    const user = userEvent.setup();
    render(<CreateNotificationSchedulePage />);

    expect(screen.getByRole("heading", { name: /New notification schedule/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockUseNotificationScheduleForm).toHaveBeenCalledWith({ mode: "create" });
    expect(submitAction).toHaveBeenCalledTimes(1);
    expect(cancelAction).toHaveBeenCalledTimes(1);
  });

  it("edit route passes schedule id and wires submit action", async () => {
    const user = userEvent.setup();
    render(<EditNotificationSchedulePage />);

    expect(screen.getByRole("heading", { name: /Edit notification schedule/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockUseNotificationScheduleForm).toHaveBeenCalledWith({ mode: "edit", scheduleId: "12" });
    expect(submitAction).toHaveBeenCalledTimes(1);
  });
});

