/**
 * Centralized number formatting helpers for English-language UI surfaces.
 */

/**
 * Formats a number with locale-aware grouping separators.
 *
 * @param value Numeric value or nullish input.
 * @param locale Locale used for formatting. Defaults to `en-US`.
 * @returns A formatted number or an em dash for empty values.
 */
export function formatNumber(value?: number | null, locale = "en-US"): string {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat(locale).format(Number(value));
}

/**
 * Formats a number as a percentage label (for example `42.5 %`).
 *
 * @param value Numeric value in the 0–100 range.
 * @param decimals Number of decimal places. Defaults to `1`.
 * @returns A formatted percent string or an em dash for empty values.
 */
export function formatPercent(value?: number | null, decimals = 1): string {
  if (value == null) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)} %`;
}

/**
 * Formats a number as a compact KPI label using `K` and `M` suffixes.
 *
 * @param value Numeric value.
 * @param decimals Number of decimal places for abbreviated values. Defaults to `1`.
 * @returns A compact numeric label such as `3.5K`, `2.5M`, or `42`.
 */
export function formatCompactNumber(value?: number | null, decimals = 1): string {
  if (value == null) {
    return "—";
  }

  const numericValue = Number(value);

  if (numericValue >= 1_000_000) {
    return `${(numericValue / 1_000_000).toFixed(decimals)}M`;
  }

  if (numericValue >= 1_000) {
    return `${(numericValue / 1_000).toFixed(decimals)}K`;
  }

  return Math.round(numericValue).toString();
}

/**
 * Formats a number as a compact percentage label without a separator.
 *
 * @param value Numeric value in the 0–100 range.
 * @param decimals Number of decimal places. Defaults to `1`.
 * @returns A compact percent string such as `87.5%` or an em dash for empty values.
 */
export function formatPercentCompact(value?: number | null, decimals = 1): string {
  if (value == null) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)}%`;
}
