import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ConfirmProvider, { useConfirmContext } from "@/components/providers/ConfirmProvider";

function Consumer() {
  const { confirmAction } = useConfirmContext();

  return (
    <button
      onClick={async () => {
        const result = await confirmAction({
          title: "Delete",
          message: "Delete item?",
          confirmLabel: "Delete",
          tone: "danger",
        });

        const target = document.getElementById("confirm-result");
        if (target) {
          target.textContent = String(result);
        }
      }}
    >
      Open confirm
    </button>
  );
}

describe("ConfirmProvider", () => {
  it("resolves confirmAction=true when user confirms", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmProvider>
        <Consumer />
        <div id="confirm-result" />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole("button", { name: /Open confirm/i }));
    expect(screen.getByRole("dialog", { name: /Delete/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    await waitFor(() => {
      expect(document.getElementById("confirm-result")?.textContent).toBe("true");
    });
  });

  it("resolves confirmAction=false when user cancels", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmProvider>
        <Consumer />
        <div id="confirm-result" />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole("button", { name: /Open confirm/i }));
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    await waitFor(() => {
      expect(document.getElementById("confirm-result")?.textContent).toBe("false");
    });
  });
});

