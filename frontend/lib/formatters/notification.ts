const KNOWN_UPPERCASE_WORDS = new Set(["sla", "api", "id", "url", "otp", "kpi"]);

function normalizeWord(word: string): string {
  const lower = word.toLowerCase();

  if (KNOWN_UPPERCASE_WORDS.has(lower)) {
    return lower.toUpperCase();
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Converts machine notification identifiers like `sla_breach`
 * or `contract-status-changed` into readable labels.
 */
export function formatNotificationType(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeWord)
    .join(" ");
}

