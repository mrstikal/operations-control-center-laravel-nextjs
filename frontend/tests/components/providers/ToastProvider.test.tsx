import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ToastProvider, { useToastContext } from "@/components/providers/ToastProvider";

function Consumer() {
  const { showSuccessAction, showErrorAction } = useToastContext();

  return (
    <div>
      <button onClick={() => showSuccessAction("Saved")}>Show success</button>
      <button onClick={() => showErrorAction("Failed")}>Show error</button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders success and error toasts and allows manual dismiss", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /Show success/i }));
    await user.click(screen.getByRole("button", { name: /Show error/i }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: /Close notification/i });
    await user.click(closeButtons[0]);

    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});

