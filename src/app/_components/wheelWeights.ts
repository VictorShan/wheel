import type { Item } from "./types";

/** Days it takes a freshly selected item to climb back to its full weight. */
const RECOVERY_DAYS = 5;
/** What a just-selected item is worth in the meantime. */
const MIN_RECENCY_WEIGHT = 1 / RECOVERY_DAYS;
/** Nothing ever reaches zero: an item with no weight silently vanishes from the wheel. */
const MIN_WEIGHT = 0.05;

const DAY_MILLIS = 1000 * 60 * 60 * 24;

/**
 * How much an item's score is worth.
 *
 * Deliberately depends only on this item's own votes. Measuring against the lobby's lowest score
 * (the previous behaviour) meant downvoting one item re-weighted every other item in the lobby and
 * diluted everyone else's upvotes.
 */
export function voteWeight(upvotes: number) {
  if (!Number.isFinite(upvotes)) return 1;
  return upvotes >= 0 ? 1 + upvotes : 1 / (1 - upvotes);
}

/**
 * How much of that weight an item has earned back since it was last selected: 20% right after it
 * is picked, recovering to 100% over RECOVERY_DAYS.
 *
 * Timestamps have been written in several formats over the life of this app, and the SQL
 * `CURRENT_TIMESTAMP` form is not in the ECMAScript date grammar (Safari returns Invalid Date). An
 * unparseable date used to produce a NaN weight, which made the total NaN and left the entire
 * wheel blank, so it counts as "not selected recently" instead.
 */
export function recencyWeight(lastSelectedAt: string | null | undefined) {
  const lastSelected = parseTimestamp(lastSelectedAt);
  if (lastSelected === undefined) return 1;
  // Clamped at both ends: clock skew between the writer and the viewer can otherwise put the
  // selection in the future and give the item a weight of zero or less.
  const days = Math.max(0, Date.now() - lastSelected) / DAY_MILLIS;
  // Whole days, as documented: 20% right after selection, another 20% each day after that.
  return Math.min(
    1,
    Math.max(MIN_RECENCY_WEIGHT, Math.ceil(days) / RECOVERY_DAYS),
  );
}

export function itemWeight(item: Pick<Item, "upvotes" | "lastSelectedAt">) {
  return Math.max(
    MIN_WEIGHT,
    voteWeight(item.upvotes) * recencyWeight(item.lastSelectedAt),
  );
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  // "2026-08-19 19:27:37" (SQL CURRENT_TIMESTAMP) is UTC but not valid ISO 8601.
  const asIso = Date.parse(value.replace(" ", "T") + "Z");
  return Number.isNaN(asIso) ? undefined : asIso;
}
