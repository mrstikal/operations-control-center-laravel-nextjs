import { describe, expect, it } from "vitest";
import {
  can,
  canApproveContract,
  canDeleteAsset,
  canEscalateIncident,
  canView,
  hasPermission,
} from "@/lib/permissions";
import type { Permission } from "@/lib/types";

const permissions: Permission[] = [
  { resource: "contracts", action: "view" },
  { resource: "contracts", action: "approve" },
  { resource: "incidents", action: "escalate" },
  { resource: "assets", action: "delete" },
];

describe("permissions helpers", () => {
  it("returns false for empty permission list", () => {
    expect(hasPermission(undefined, "contracts", "view")).toBe(false);
    expect(hasPermission([], "contracts", "view")).toBe(false);
  });

  it("recognises a specific permission and its alias helpers", () => {
    expect(hasPermission(permissions, "contracts", "approve")).toBe(true);
    expect(can("incidents", "escalate", permissions)).toBe(true);
    expect(canView(permissions, "contracts")).toBe(true);
    expect(canApproveContract(permissions)).toBe(true);
  });

  it("returns false when permission is missing", () => {
    expect(canDeleteAsset([])).toBe(false);
    expect(canEscalateIncident([{ resource: "incidents", action: "view" }])).toBe(false);
  });
});
