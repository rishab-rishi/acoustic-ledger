import { type SQL, and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import { categories, products, variants } from "./schema";

export function getCategories() {
  return db.query.categories.findMany({ orderBy: asc(categories.name) });
}

export function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

/**
 * Categories with the counts the storefront "rack" needs on its faceplates:
 * how many active products, how much stock across their variants, and the
 * cheapest way in.
 */
export async function getCategoriesWithMeta() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`count(distinct ${products.id})::int`,
      totalStock: sql<number>`coalesce(sum(${variants.stock}), 0)::int`,
      priceFromCents: sql<number>`coalesce(min(${products.basePriceCents}), 0)::int`,
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.active, true))
    )
    .leftJoin(variants, eq(variants.productId, products.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return rows;
}

/** Fold a product's variants into the stock/price signal a catalog row shows. */
function withStockSignal<
  T extends {
    basePriceCents: number;
    variants: { name: string; priceCents: number; stock: number }[];
  },
>(product: T) {
  const { variants: variantRows, ...rest } = product;
  const totalStock = variantRows.reduce((sum, v) => sum + v.stock, 0);
  const prices = variantRows.map((v) => v.priceCents);
  const priceMinCents = prices.length ? Math.min(...prices) : product.basePriceCents;
  const priceMaxCents = prices.length ? Math.max(...prices) : product.basePriceCents;
  return {
    ...rest,
    variantCount: variantRows.length,
    variantNames: variantRows.map((v) => v.name),
    totalStock,
    inStock: totalStock > 0,
    priceMinCents,
    priceMaxCents,
  };
}

export async function getFeaturedProducts(limit = 6) {
  const rows = await db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.featured, true)),
    orderBy: desc(products.createdAt),
    limit,
    with: {
      category: true,
      variants: { columns: { name: true, priceCents: true, stock: true } },
    },
  });
  return rows.map(withStockSignal);
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

/**
 * At 38 seeded products, no limit is invisible. At scale it's the cheapest
 * way for one request to cost a full table scan and a multi-megabyte RSC
 * payload — so the cap is enforced inside searchProducts() itself,
 * regardless of what a caller (or a hand-typed `?limit=100000`, if a page
 * ever exposes one) asks for. This is the security-relevant half of
 * pagination; don't relax it without re-reading CLAUDE-CODE-TASKS.md §5.1.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 60;

export type SearchParams = {
  q?: string;
  category?: string;
  minCents?: number;
  maxCents?: number;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
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

  // Clamped unconditionally — never trust a caller's limit, whatever its
  // source. A negative/NaN/oversized offset just clamps to 0.
  const limit = Math.min(Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = Math.max(0, params.offset ?? 0);

  let categoryId: string | undefined;
  if (category) {
    const found = await getCategoryBySlug(category);
    if (!found) return { products: [], total: 0 };
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
  const where = and(...filters);

  const [rows, [countRow]] = await Promise.all([
    db.query.products.findMany({
      where,
      orderBy: orderFor(sort, q),
      limit,
      offset,
      with: {
        category: true,
        variants: { columns: { name: true, priceCents: true, stock: true } },
      },
    }),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  return { products: rows.map(withStockSignal), total: countRow?.n ?? 0 };
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
