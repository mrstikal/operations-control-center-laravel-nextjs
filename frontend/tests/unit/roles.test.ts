import { describe, expect, it } from "vitest";
import {
  canSeeBusinessMetrics,
  getHighestRole,
  getRoleBadgeColor,
  isAdmin,
  isViewerClient,
} from "@/lib/roles";
import type { UserRole } from "@/lib/types";

const viewer: UserRole = { id: 1, name: "Viewer", level: 1, description: "" };
const admin: UserRole = { id: 2, name: "Admin", level: 4, description: "" };
const viewerClient: UserRole = {
  id: 3,
  name: "Viewer – Client",
  level: 1.1,
  description: "",
};

describe("roles helpers", () => {
  it("finds the highest role by level", () => {
    expect(getHighestRole([viewer, admin])).toEqual(admin);
    expect(getHighestRole([])).toBeNull();
  });

  it("correctly identifies admin and viewer-client roles", () => {
    expect(isAdmin([viewer, admin])).toBe(true);
    expect(isViewerClient([viewerClient])).toBe(true);
    expect(isViewerClient([viewer, admin])).toBe(false);
  });

  it("hides business metrics for Viewer-Client", () => {
    expect(canSeeBusinessMetrics([viewerClient])).toBe(false);
    expect(canSeeBusinessMetrics([viewer])).toBe(true);
  });

  it("returns badge colour for known and unknown roles", () => {
    expect(getRoleBadgeColor(admin)).toBe("#ea580c");
    expect(getRoleBadgeColor(null)).toBe("#64748b");
  });
});
