import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/users", () => ({
  listUsers: mockListUsers,
}));

import AssetLifecycleModal from "@/components/assets/AssetLifecycleModal";

type LifecycleAction =
  | "retire"
  | "dispose"
  | "transfer"
  | "reassign"
  | "delete"
  | "restore"
  | "hard-delete";

type ModalProps = React.ComponentProps<typeof AssetLifecycleModal>;

function renderModal(overrides: Partial<ModalProps> = {}) {
  const onCloseAction = vi.fn();
  const onConfirmAction = vi.fn().mockResolvedValue(undefined);

  const props: ModalProps = {
    isOpen: true,
    action: "transfer",
    assetName: "Server A",
    currentLocation: "DC-1",
    currentDepartment: "Ops",
    currentAssignedToId: 2,
    currentAssignedToName: "Alice",
    loading: false,
    onCloseAction,
    onConfirmAction,
    ...overrides,
  };

  return {
    ...render(<AssetLifecycleModal {...props} />),
    onCloseAction,
    onConfirmAction,
  };
}

describe("AssetLifecycleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUsers.mockResolvedValue({ success: true, message: "", data: [] });
  });

  it("renders transfer flow with initial values and submits payload", async () => {
    const user = userEvent.setup();
    const { onConfirmAction } = renderModal({ action: "transfer" });

    expect(screen.getByRole("dialog", { name: /Transfer Asset/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("DC-1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ops")).toBeInTheDocument();

    await user.clear(screen.getByDisplayValue("DC-1"));
    await user.type(screen.getByPlaceholderText(/Data Center Hall B/i), "DC-2");
    await user.clear(screen.getByDisplayValue("Ops"));
    await user.type(screen.getByPlaceholderText(/Infrastructure/i), "Infra");
    await user.type(
      screen.getByPlaceholderText(/Explain why you are transfering this asset/i),
      "Relocation"
    );

    await user.click(screen.getByRole("button", { name: /^Confirm Transfer$/i }));

    await waitFor(() => {
      expect(onConfirmAction).toHaveBeenCalledWith({
        reason: "Relocation",
        location: "DC-2",
        department: "Infra",
      });
    });
  });

  it("shows validation error when reason is missing", async () => {
    const user = userEvent.setup();
    const { onConfirmAction } = renderModal({ action: "retire" });

    const reasonField = screen.getByPlaceholderText(/Explain why you are retireing this asset/i);

    await user.click(screen.getByRole("button", { name: /^Confirm Retire$/i }));

    expect(reasonField).toBeInvalid();
    expect(onConfirmAction).not.toHaveBeenCalled();
  });

  it("shows transfer-specific validation when location is missing", async () => {
    const user = userEvent.setup();
    const { onConfirmAction } = renderModal({ action: "transfer", currentLocation: "" });

    const locationField = screen.getByPlaceholderText(/Data Center Hall B/i);

    await user.type(
      screen.getByPlaceholderText(/Explain why you are transfering this asset/i),
      "Move"
    );
    await user.click(screen.getByRole("button", { name: /^Confirm Transfer$/i }));

    expect(locationField).toBeInvalid();
    expect(onConfirmAction).not.toHaveBeenCalled();
  });

  it("loads users for reassign action and submits selected assignment", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValueOnce({
      success: true,
      message: "",
      data: [{ id: 2, name: "Alice", email: "alice@test.local" }],
    });

    const { onConfirmAction } = renderModal({
      action: "reassign",
      currentAssignedToId: 2,
      currentAssignedToName: "Alice",
    });

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith({ per_page: 100 });
    });

    expect(screen.getByText(/Current assignee: Alice/i)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/Explain why you are reassigning this asset/i),
      "Ownership change"
    );
    await user.click(screen.getByRole("button", { name: /^Confirm Reassign$/i }));

    await waitFor(() => {
      expect(onConfirmAction).toHaveBeenCalledWith({
        reason: "Ownership change",
        assigned_to: 2,
      });
    });
  });

  it("propagates API errors and keeps modal open", async () => {
    const user = userEvent.setup();
    const { onConfirmAction } = renderModal({ action: "delete" });
    onConfirmAction.mockRejectedValueOnce(new Error("Delete failed"));

    await user.type(
      screen.getByPlaceholderText(/Explain why you are soft deleting this asset/i),
      "Outdated"
    );
    await user.click(screen.getByRole("button", { name: /^Confirm Soft Delete$/i }));

    expect(await screen.findByText(/Delete failed/i)).toBeInTheDocument();
  });

  it("resets state on cancel and blocks close while loading", async () => {
    const user = userEvent.setup();
    const { onCloseAction, rerender } = renderModal({ action: "retire" });

    const reasonField = screen.getByPlaceholderText(/Explain why you are retireing this asset/i);
    await user.type(reasonField, "Legacy hardware");
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    expect(onCloseAction).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText(/Explain why you are retireing this asset/i)).toHaveValue("");

    rerender(
      <AssetLifecycleModal
        isOpen
        action={"retire" as LifecycleAction}
        assetName="Server A"
        currentLocation="DC-1"
        currentDepartment="Ops"
        currentAssignedToId={2}
        currentAssignedToName="Alice"
        loading
        onCloseAction={onCloseAction}
        onConfirmAction={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const cancel = screen.getByRole("button", { name: /^Cancel$/i });
    expect(cancel).toBeDisabled();
    await user.click(cancel);
    expect(onCloseAction).toHaveBeenCalledTimes(1);
  });
});


