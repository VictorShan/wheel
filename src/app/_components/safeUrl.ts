/**
 * An item's URL, if it is safe to put in an href.
 *
 * Item URLs are validated on the way in, but rows written before that validation existed (or copied
 * in by the migration) can hold anything a user typed - and React renders a `javascript:` href as a
 * live link, warning about it without blocking it. Anything that isn't http(s) is treated as no URL
 * at all.
 */
export function safeUrl(url: string | null | undefined) {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    if (protocol === "http:" || protocol === "https:") return url;
  } catch {
    // Not a URL.
  }
  return undefined;
}
