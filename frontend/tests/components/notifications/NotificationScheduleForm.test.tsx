import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/formatters/notification", () => ({
  formatNotificationType: (v: string) => v.replace(/_/g, " "),
}));

import NotificationScheduleForm from "@/components/notifications/NotificationScheduleForm";

const DEFAULT_PROPS = {
  title: "Create Notification Schedule",
  description: "Configure when and to whom notifications are sent.",
  loading: false,
  submitting: false,
  error: null,
  isReadOnly: false,
  name: "",
  notificationType: "",
  trigger: "incident_assigned",
  isActive: true,
  selectedRoles: ["Manager"],
  dedupeTtlMinutes: 30,
  advancedMode: false,
  conditionsJson: "",
  recipientsJson: JSON.stringify({ schema_version: 1, channels: ["in_app"] }, null, 2),
  setNameAction: vi.fn(),
  setNotificationTypeAction: vi.fn(),
  setTriggerAction: vi.fn(),
  setIsActiveAction: vi.fn(),
  setSelectedRolesAction: vi.fn(),
  setDedupeTtlMinutesAction: vi.fn(),
  setAdvancedModeAction: vi.fn(),
  setConditionsJsonAction: vi.fn(),
  setRecipientsJsonAction: vi.fn(),
  onSubmitAction: vi.fn(),
  onCancelAction: vi.fn(),
};

describe("NotificationScheduleForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} loading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("renders form title and description", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} />);
    expect(screen.getByText("Create Notification Schedule")).toBeInTheDocument();
    expect(screen.getByText(/configure when/i)).toBeInTheDocument();
  });

  it("renders validation error banner", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} error="Name is required." />);
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("calls setNameAction when name input changes", async () => {
    const user = userEvent.setup();
    const setNameAction = vi.fn();

    render(<NotificationScheduleForm {...DEFAULT_PROPS} setNameAction={setNameAction} />);

    await user.type(screen.getByPlaceholderText(/Incident assignment alert/i), "My Alert");
    expect(setNameAction).toHaveBeenCalled();
  });

  it("calls setTriggerAction when trigger select changes", async () => {
    const user = userEvent.setup();
    const setTriggerAction = vi.fn();

    render(<NotificationScheduleForm {...DEFAULT_PROPS} setTriggerAction={setTriggerAction} />);

    await user.selectOptions(screen.getByRole("combobox"), "sla_breach");
    expect(setTriggerAction).toHaveBeenCalledWith("sla_breach");
  });

  it("shows selected roles and toggles them", async () => {
    const user = userEvent.setup();
    const setSelectedRolesAction = vi.fn();

    render(
      <NotificationScheduleForm
        {...DEFAULT_PROPS}
        selectedRoles={["Admin"]}
        setSelectedRolesAction={setSelectedRolesAction}
      />
    );

    const adminCheckbox = screen.getAllByRole("checkbox").find((c) => {
      return c.closest("label")?.textContent?.includes("Admin");
    });
    expect(adminCheckbox).toBeChecked();

    const managerCheckbox = screen.getAllByRole("checkbox").find((c) =>
      c.closest("label")?.textContent?.includes("Manager")
    );
    expect(managerCheckbox).not.toBeChecked();

    await user.click(managerCheckbox!);
    expect(setSelectedRolesAction).toHaveBeenCalledWith(expect.arrayContaining(["Manager"]));
  });

  it("shows advanced JSON textareas when advanced mode is on", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} advancedMode conditionsJson="{}" />);

    expect(screen.getByPlaceholderText(/schema_version/i)).toBeInTheDocument();
  });

  it("hides JSON textareas when advanced mode is off", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} advancedMode={false} />);

    expect(screen.queryByPlaceholderText(/schema_version/i)).not.toBeInTheDocument();
  });

  it("calls onSubmitAction when Save button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmitAction = vi.fn();

    render(<NotificationScheduleForm {...DEFAULT_PROPS} onSubmitAction={onSubmitAction} />);

    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    expect(onSubmitAction).toHaveBeenCalledTimes(1);
  });

  it("calls onCancelAction when Cancel / Back button is clicked", async () => {
    const user = userEvent.setup();
    const onCancelAction = vi.fn();

    render(<NotificationScheduleForm {...DEFAULT_PROPS} onCancelAction={onCancelAction} />);

    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(onCancelAction).toHaveBeenCalledTimes(1);
  });

  it("disables form fields and Save button when isReadOnly", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} isReadOnly />);

    expect(screen.getByRole("button", { name: /save schedule/i })).toBeDisabled();
    const nameInput = screen.getByPlaceholderText(/Incident assignment alert/i);
    expect(nameInput).toBeDisabled();
  });

  it("shows 'Saving...' text when submitting", () => {
    render(<NotificationScheduleForm {...DEFAULT_PROPS} submitting />);

    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });
});

