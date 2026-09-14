import { unstable_cache } from "next/cache";
import {
  getCategories,
  getCategoryBySlug,
  getPriceRange,
  getProductBySlug,
  getSuggestions,
  PRODUCTS_CACHE_TAG,
  searchProducts,
  type SearchParams,
} from "./queries";

/**
 * Cached read path for the public catalog (/products) and product detail
 * (/products/[slug]) pages — the two routes that are public, identical for
 * every visitor, and change only when an admin edits the catalog or a
 * purchase changes stock. Everything else (cart, orders, admin) keeps
 * calling the plain functions in queries.ts and stays request-fresh.
 *
 * `unstable_cache` caches the query *result*, not the rendered page — the
 * pages still render per request (searchParams on /products makes that
 * unavoidable under the current, non-Cache-Components model), but the
 * expensive part, the actual database round trip, is served from Next's
 * Data Cache once per cache key instead of on every request. That's what
 * stops "every single request reaches Postgres" (Task 2.1's finding), even
 * though the route itself still shows as dynamic in the build output.
 *
 * 60s revalidate is the time-based backstop; PRODUCTS_CACHE_TAG (see
 * queries.ts) is revalidated on demand from every place that actually
 * changes a product or its stock.
 */
const REVALIDATE_SECONDS = 60;
const cacheOptions = { tags: [PRODUCTS_CACHE_TAG], revalidate: REVALIDATE_SECONDS };

export const getCachedCategories = unstable_cache(
  getCategories,
  ["categories"],
  cacheOptions
);

export const getCachedCategoryBySlug = unstable_cache(
  getCategoryBySlug,
  ["category-by-slug"],
  cacheOptions
);

export const getCachedPriceRange = unstable_cache(
  getPriceRange,
  ["price-range"],
  cacheOptions
);

export const getCachedSuggestions = unstable_cache(
  getSuggestions,
  ["suggestions"],
  cacheOptions
);

export const searchProductsCached = unstable_cache(
  (params: SearchParams) => searchProducts(params),
  ["search-products"],
  cacheOptions
);

export const getCachedProductBySlug = unstable_cache(
  getProductBySlug,
  ["product-by-slug"],
  cacheOptions
);
