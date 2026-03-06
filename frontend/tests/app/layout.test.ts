// app/layout.tsx – only tests the exported metadata constants; the component itself
// is a Next.js server component that relies on CSS / font infrastructure not
// available in jsdom, so it is not rendered here.
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Roboto: () => ({ className: "font-roboto", variable: "--font-roboto" }),
}));

import { metadata, viewport } from "@/app/layout";

describe("Root Layout – metadata", () => {
  it("has the correct page title", () => {
    expect(metadata.title).toBe("OCC Frontend");
  });

  it("has a non-empty description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });
});

describe("Root Layout – viewport", () => {
  it("sets device-width", () => {
    expect(viewport.width).toBe("device-width");
  });

  it("disables user scaling", () => {
    expect(viewport.userScalable).toBe(false);
  });
});
