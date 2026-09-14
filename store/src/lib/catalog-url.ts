export const CATALOG_KEYS = ["q", "category", "min", "max", "sort", "page"] as const;

export type CatalogKey = (typeof CATALOG_KEYS)[number];
export type CatalogParams = Partial<Record<CatalogKey, string>>;

/**
 * Merge a change into the current catalog filters and render the URL.
 *
 * Every filter lives in the query string rather than component state, so the
 * back button, a reload and a pasted link all reproduce the same result set.
 * Passing a key explicitly as undefined clears it; omitting it keeps whatever
 * is currently applied.
 *
 * `page` is special: changing any *other* filter without saying anything
 * about `page` resets it, so narrowing a search from a lower page can't land
 * you past the end of a now-shorter result set. Pager links themselves patch
 * `page` explicitly and are unaffected.
 */
export function catalogHref(
  current: CatalogParams,
  patch: CatalogParams = {}
): string {
  const merged: Record<string, string> = {};
  const changesOtherFilters = Object.keys(patch).some((key) => key !== "page");

  for (const key of CATALOG_KEYS) {
    const value =
      key === "page" && !("page" in patch) && changesOtherFilters
        ? undefined
        : key in patch
          ? patch[key]
          : current[key];
    if (value) merged[key] = value;
  }

  const qs = new URLSearchParams(merged).toString();
  return qs ? `/products?${qs}` : "/products";
}
