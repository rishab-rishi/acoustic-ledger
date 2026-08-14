export const CATALOG_KEYS = ["q", "category", "min", "max", "sort"] as const;

export type CatalogKey = (typeof CATALOG_KEYS)[number];
export type CatalogParams = Partial<Record<CatalogKey, string>>;

/**
 * Merge a change into the current catalog filters and render the URL.
 *
 * Every filter lives in the query string rather than component state, so the
 * back button, a reload and a pasted link all reproduce the same result set.
 * Passing a key explicitly as undefined clears it; omitting it keeps whatever
 * is currently applied.
 */
export function catalogHref(
  current: CatalogParams,
  patch: CatalogParams = {}
): string {
  const merged: Record<string, string> = {};

  for (const key of CATALOG_KEYS) {
    const value = key in patch ? patch[key] : current[key];
    if (value) merged[key] = value;
  }

  const qs = new URLSearchParams(merged).toString();
  return qs ? `/products?${qs}` : "/products";
}
