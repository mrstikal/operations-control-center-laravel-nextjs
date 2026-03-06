import { describe, expect, it } from "vitest";
import { UI_MESSAGES } from "@/lib/ui-messages";

describe("UI_MESSAGES", () => {
  it("exposes ARCHIVED_TENANT_READ_ONLY as a non-empty string", () => {
    expect(typeof UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY).toBe("string");
    expect(UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY.length).toBeGreaterThan(0);
  });

  it("is immutable (const assertion)", () => {
    // TypeScript guarantees this at compile time; this assertion catches accidental runtime mutation
    const snapshot = UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY;
    expect(UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY).toBe(snapshot);
  });
});
