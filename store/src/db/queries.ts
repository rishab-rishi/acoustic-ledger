import { type SQL, and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import { categories, products, variants } from "./schema";

export function getCategories() {
  return db.query.categories.findMany({ orderBy: asc(categories.name) });
}

export function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

export function getFeaturedProducts(limit = 6) {
  return db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.featured, true)),
    orderBy: desc(products.createdAt),
    limit,
    with: { category: true },
  });
}

export const SORTS = [
  "relevance",
  "price-asc",
  "price-desc",
  "newest",
  "name",
] as const;

export type ProductSort = (typeof SORTS)[number];

export function isSort(value: string | undefined): value is ProductSort {
  return !!value && (SORTS as readonly string[]).includes(value);
}

export type SearchParams = {
  q?: string;
  category?: string;
  minCents?: number;
  maxCents?: number;
  sort?: ProductSort;
};

/**
 * Full-text match against the generated `search_vector` (build spec §3).
 *
 * `websearch_to_tsquery` rather than `to_tsquery`: it understands quoted
 * phrases and `-exclusions`, and — the part that matters here — it never
 * throws on whatever a person types. `to_tsquery` raises a syntax error on a
 * bare `&` or an unbalanced quote, which would turn a typo into a 500.
 *
 * FTS alone only matches whole lexemes, so "moni" finds nothing while the user
 * is still typing. The ILIKE arm covers those partial words; ranking keeps the
 * real matches on top.
 */
function matchesQuery(q: string): SQL {
  return sql`(
    ${products.searchVector} @@ websearch_to_tsquery('english', ${q})
    or ${products.name} ilike ${`%${q}%`}
  )`;
}

function rankFor(q: string): SQL {
  return sql`ts_rank(${products.searchVector}, websearch_to_tsquery('english', ${q}))`;
}

function orderFor(sort: ProductSort, q?: string) {
  switch (sort) {
    case "price-asc":
      return [asc(products.basePriceCents), asc(products.name)];
    case "price-desc":
      return [desc(products.basePriceCents), asc(products.name)];
    case "newest":
      return [desc(products.createdAt), asc(products.name)];
    case "name":
      return [asc(products.name)];
    default:
      // Relevance only means something alongside a query. Ties (and the ILIKE
      // matches, which rank 0) fall back to name so the order stays stable.
      return q ? [desc(rankFor(q)), asc(products.name)] : [asc(products.name)];
  }
}

export async function searchProducts(params: SearchParams) {
  const { q, category, minCents, maxCents, sort = "relevance" } = params;

  let categoryId: string | undefined;
  if (category) {
    const found = await getCategoryBySlug(category);
    if (!found) return [];
    categoryId = found.id;
  }

  const filters = [
    eq(products.active, true),
    categoryId ? eq(products.categoryId, categoryId) : undefined,
    q ? matchesQuery(q) : undefined,
    // Filter on the price the card actually shows, so a "$200 and under"
    // result can't come back displaying $249.
    minCents !== undefined ? gte(products.basePriceCents, minCents) : undefined,
    maxCents !== undefined ? lte(products.basePriceCents, maxCents) : undefined,
  ].filter(Boolean) as SQL[];

  return db.query.products.findMany({
    where: and(...filters),
    orderBy: orderFor(sort, q),
    with: { category: true },
  });
}

/** Bounds for the price filter's placeholder text. */
export async function getPriceRange() {
  const [row] = await db
    .select({
      min: sql<number>`min(${products.basePriceCents})::int`,
      max: sql<number>`max(${products.basePriceCents})::int`,
    })
    .from(products)
    .where(eq(products.active, true));

  return { minCents: row?.min ?? 0, maxCents: row?.max ?? 0 };
}

/** Cheap "did you mean" fallback when a search returns nothing. */
export async function getSuggestions(q: string, limit = 4) {
  const terms = q.split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  return db.query.products.findMany({
    where: and(
      eq(products.active, true),
      or(...terms.map((t) => ilike(products.name, `%${t}%`)))
    ),
    orderBy: asc(products.name),
    limit,
    with: { category: true },
  });
}

export function getProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.active, true)),
    with: {
      category: true,
      variants: { orderBy: asc(variants.priceCents) },
    },
  });
}
