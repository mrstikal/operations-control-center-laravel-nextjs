import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_STATUS_COLORS,
  DAYS_OF_WEEK,
  TIME_OFF_STATUS_COLORS,
} from "@/lib/hr-constants";

describe("AVAILABILITY_STATUS_COLORS", () => {
  it("contains expected availability statuses", () => {
    expect(Object.keys(AVAILABILITY_STATUS_COLORS)).toEqual(
      expect.arrayContaining(["available", "on_leave", "on_maintenance", "unavailable"])
    );
  });

  it("each value is a non-empty Tailwind class string", () => {
    for (const value of Object.values(AVAILABILITY_STATUS_COLORS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe("TIME_OFF_STATUS_COLORS", () => {
  it("contains expected time-off statuses", () => {
    expect(Object.keys(TIME_OFF_STATUS_COLORS)).toEqual(
      expect.arrayContaining(["pending", "approved", "rejected", "cancelled"])
    );
  });
});

describe("DAYS_OF_WEEK", () => {
  it("contains exactly 7 days", () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("days are ordered Monday–Sunday with values 1–7", () => {
    expect(DAYS_OF_WEEK[0]).toMatchObject({ value: 1, label: "Monday" });
    expect(DAYS_OF_WEEK[6]).toMatchObject({ value: 7, label: "Sunday" });
  });

  it("each day has a numeric value and a string label", () => {
    for (const day of DAYS_OF_WEEK) {
      expect(typeof day.value).toBe("number");
      expect(typeof day.label).toBe("string");
    }
  });
});
