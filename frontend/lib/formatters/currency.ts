/**
 * Centralized currency formatting helpers for English-language UI surfaces.
 */

/**
 * Formats a numeric value as currency.
 *
 * @param value Numeric value or nullish input.
 * @param currency ISO currency code. Defaults to `USD`.
 * @param locale Locale used for formatting. Defaults to `en-US`.
 * @returns A formatted currency string or an em dash for empty values.
 */
export function formatCurrency(value?: number | null, currency = "USD", locale = "en-US"): string {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}
