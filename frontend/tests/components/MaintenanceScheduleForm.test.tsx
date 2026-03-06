import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MaintenanceScheduleForm from "@/components/assets/detail/MaintenanceScheduleForm";
import type { MaintenanceSchedule } from "@/lib/types";

describe("MaintenanceScheduleForm", () => {
  it("submits payload for create flow", async () => {
    const onSubmitAction = vi.fn().mockResolvedValue(undefined);

    render(
      <MaintenanceScheduleForm
        isOpen
        editing={null}
        loading={false}
        error={null}
        onCloseAction={vi.fn()}
        onSubmitAction={onSubmitAction}
      />
    );

    await userEvent.type(
      screen.getByPlaceholderText("e.g. Quarterly preventive maintenance"),
      "Quarterly check"
    );

    await userEvent.click(screen.getByPlaceholderText("Select frequency…"));
    await userEvent.click(screen.getByText("Custom interval"));
    await userEvent.type(screen.getByPlaceholderText("e.g. 90"), "45");

    await userEvent.click(screen.getByRole("checkbox", { name: /active/i }));
    await userEvent.click(screen.getByRole("button", { name: "Add schedule" }));

    expect(onSubmitAction).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: "custom",
        interval_days: 45,
        description: "Quarterly check",
        is_active: false,
      })
    );
  });

  it("renders edit mode with prefilled values", () => {
    const editing: MaintenanceSchedule = {
      id: 31,
      asset_id: 5,
      frequency: "monthly",
      interval_days: 30,
      description: "Monthly maintenance",
      next_due_date: "2026-04-10",
      is_active: true,
      due_state: "due_soon",
    };

    render(
      <MaintenanceScheduleForm
        isOpen
        editing={editing}
        loading={false}
        error={null}
        onCloseAction={vi.fn()}
        onSubmitAction={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "Edit Maintenance Schedule" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Monthly maintenance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});

