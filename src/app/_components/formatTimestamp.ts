/**
 * Formats a timestamp column for display.
 *
 * These columns are text, and the values in them were written in several formats over time; the SQL
 * `CURRENT_TIMESTAMP` form ("2026-08-19 19:27:37") is UTC but not valid ISO 8601, so browsers other
 * than V8 reject it. Anything unparseable is shown as-is rather than as "Invalid Date".
 */
export function formatTimestamp(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  },
) {
  if (!value) return "never";
  const parsed = parseTimestamp(value);
  if (parsed === undefined) return value;
  if (parsed <= 0) return "never";
  return new Date(parsed).toLocaleString("en-US", options);
}

function parseTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  const asIso = Date.parse(value.replace(" ", "T") + "Z");
  return Number.isNaN(asIso) ? undefined : asIso;
}
