import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MaintenanceLogForm from "@/components/assets/detail/MaintenanceLogForm";
import type { MaintenanceLog } from "@/lib/types";

describe("MaintenanceLogForm", () => {
  it("submits payload for create flow", async () => {
    const onSubmitAction = vi.fn().mockResolvedValue(undefined);

    render(
      <MaintenanceLogForm
        isOpen
        editing={null}
        loading={false}
        error={null}
        onCloseAction={vi.fn()}
        onSubmitAction={onSubmitAction}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Describe what was performed..."), "Filter changed");
    await userEvent.type(screen.getByPlaceholderText("e.g. 2.5"), "2.5");
    await userEvent.type(screen.getByPlaceholderText("e.g. 150.00"), "100.50");
    await userEvent.type(screen.getByPlaceholderText("Additional notes..."), "No issues");

    await userEvent.click(screen.getByRole("button", { name: "Log maintenance" }));

    expect(onSubmitAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "preventive",
        description: "Filter changed",
        hours_spent: 2.5,
        cost: 100.5,
        notes: "No issues",
      })
    );
  });

  it("renders edit mode with prefilled values", () => {
    const editing: MaintenanceLog = {
      id: 99,
      asset_id: 5,
      performed_by: 1,
      type: "repair",
      description: "Pump fix",
      performed_at: "2026-03-10",
      notes: "Changed seal",
      hours_spent: 3,
      cost: 250,
    };

    render(
      <MaintenanceLogForm
        isOpen
        editing={editing}
        loading={false}
        error={null}
        onCloseAction={vi.fn()}
        onSubmitAction={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "Edit Maintenance Log" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pump fix")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});

