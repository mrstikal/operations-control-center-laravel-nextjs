import { describe, expect, it } from "vitest";
import {
  formatActivityTime,
  formatDate,
  formatDateForInput,
  formatDateOrDash,
  formatDateRange,
  formatDateTime,
  formatDateTimeOrDash,
  formatRelativeTime,
  formatTimeRange,
} from "@/lib/formatters/date";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatNumber, formatPercent } from "@/lib/formatters/number";

describe("formatters", () => {
  describe("date formatter", () => {
    const sample = "2024-03-09T12:30:00Z";

    it("formats dates with en-US locale", () => {
      expect(formatDate(sample)).toBe(
        new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(sample))
      );

      expect(formatDate(sample, "long")).toBe(
        new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(sample))
      );

      expect(formatDateTime(sample)).toBe(
        new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(sample))
      );
    });

    it("returns fallback values for empty inputs", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDateOrDash(undefined)).toBe("—");
      expect(formatDateTimeOrDash("not-a-date")).toBe("—");
    });

    it("formats input-safe and range values", () => {
      expect(formatDateForInput(sample)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(formatTimeRange("09:00", "17:00")).toBe("09:00 – 17:00");
      expect(formatDateRange(sample, sample)).not.toContain("–");
    });

    it("formats relative times in English", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-03-10T12:00:00Z"));

      expect(formatRelativeTime("2024-03-10T13:00:00Z")).toBe("in 1 hour");
      expect(formatRelativeTime("2024-03-10T11:00:00Z")).toBe("1 hour ago");
      expect(formatRelativeTime("2024-03-11T12:00:00Z")).toBe("tomorrow");
      expect(formatRelativeTime("2024-03-09T12:00:00Z")).toBe("yesterday");

      vi.useRealTimers();
    });

    it("formats activity timestamps in English", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-03-10T12:00:00Z"));

      expect(formatActivityTime("2024-03-10T11:59:30Z")).toBe("Just now");
      expect(formatActivityTime("2024-03-10T11:59:00Z")).toBe("1 minute ago");
      expect(formatActivityTime("2024-03-10T10:00:00Z")).toBe("2 hours ago");
      expect(formatActivityTime("2024-03-08T12:00:00Z")).toBe("2 days ago");
      expect(formatActivityTime("invalid")).toBe("invalid");

      vi.useRealTimers();
    });
  });

  describe("number and currency formatters", () => {
    it("formats currency with en-US defaults", () => {
      expect(formatCurrency(1234.5)).toBe(
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(1234.5)
      );

      expect(formatCurrency(null)).toBe("—");
    });

    it("formats numbers with en-US defaults", () => {
      expect(formatNumber(1234567.89)).toBe(new Intl.NumberFormat("en-US").format(1234567.89));

      expect(formatNumber(undefined)).toBe("—");
      expect(formatPercent(42.5)).toBe("42.5 %");
      expect(formatPercent(null)).toBe("—");
    });
  });
});
