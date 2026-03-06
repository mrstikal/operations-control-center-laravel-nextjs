import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateForInput,
  formatDateRange,
  formatRelativeTime,
  formatTimeRange,
} from "@/lib/formatters/date";

describe("date helpers", () => {
  it("returns an empty string for null or invalid values", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDateForInput(undefined)).toBe("");
  });

  it("formats a date for input as YYYY-MM-DD", () => {
    const formatted = formatDateForInput("2024-03-09T10:30:00Z");
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats dates using en-US output", () => {
    const value = "2024-03-09T10:30:00Z";

    expect(formatDate(value)).toBe(
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    );

    expect(formatDate(value, "long")).toBe(
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(value))
    );
  });

  it("formats time and date ranges correctly", () => {
    expect(formatTimeRange("09:00", "17:00")).toBe("09:00 – 17:00");
    expect(formatDateRange("2024-03-09", "2024-03-09")).not.toBe("");
    expect(formatDateRange("2024-03-09", "2024-03-09")).not.toContain("–");
  });

  it("formats relative time in English", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-10T12:00:00Z"));

    expect(formatRelativeTime("2024-03-10T13:00:00Z")).toBe("in 1 hour");
    expect(formatRelativeTime("2024-03-10T11:00:00Z")).toBe("1 hour ago");
    expect(formatRelativeTime("2024-03-11T12:00:00Z")).toBe("tomorrow");
    expect(formatRelativeTime("2024-03-09T12:00:00Z")).toBe("yesterday");

    vi.useRealTimers();
  });
});
