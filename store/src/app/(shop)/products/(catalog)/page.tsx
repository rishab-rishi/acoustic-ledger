import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { Button } from "@/components/ui/button";
import {
  getCategories,
  getCategoryBySlug,
  getPriceRange,
  getSuggestions,
  isSort,
  searchProducts,
} from "@/db/queries";
import { type CatalogParams, catalogHref } from "@/lib/catalog-url";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The catalog is one route serving search results, category listings and the
 * full catalog, so a fixed title would mislabel most of them — including in
 * the browser history, which is where it's most confusing.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogParams>;
}): Promise<Metadata> {
  const { q, category } = await searchParams;

  if (q?.trim()) {
    return {
      title: `Search: ${q.trim()}`,
      description: `Products matching “${q.trim()}” at Acoustic Ledger.`,
    };
  }

  if (category) {
    const found = await getCategoryBySlug(category);
    if (found) {
      return {
        title: found.name,
        description:
          found.description ??
          `${found.name} from Acoustic Ledger — balanced, accurate audio gear.`,
      };
    }
  }

  return { title: "All Products" };
}

function FilterChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      {children}
      <X className="size-3" />
    </Link>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category || undefined;
  const sort = isSort(params.sort) ? params.sort : "relevance";

  // Prices arrive as dollars from the form and become cents before the query;
  // anything unparseable is treated as "no bound" rather than an error page.
  const minCents = params.min ? (parseDollarsToCents(params.min) ?? undefined) : undefined;
  const maxCents = params.max ? (parseDollarsToCents(params.max) ?? undefined) : undefined;

  const [categories, products, priceRange] = await Promise.all([
    getCategories(),
    searchProducts({ q, category, minCents, maxCents, sort }),
    getPriceRange(),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const hasFilters = Boolean(q || category || minCents !== undefined || maxCents !== undefined);

  // Only worth a round trip when the search itself came back empty.
  const suggestions =
    products.length === 0 && q ? await getSuggestions(q) : [];

  const heading = q
    ? `Results for “${q}”`
    : (activeCategory?.name ?? "All Products");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* A plain GET form: filters end up in the URL, so results are
          shareable and the back button behaves. */}
      <form action="/products" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label
            htmlFor="q"
            className="text-xs tracking-wide text-muted-foreground uppercase"
          >
            Search
          </label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Monitors, headphones, cables…"
              className="h-9 w-full border border-border bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-accent"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="min"
            className="text-xs tracking-wide text-muted-foreground uppercase"
          >
            Min price
          </label>
          <input
            id="min"
            name="min"
            inputMode="decimal"
            defaultValue={params.min ?? ""}
            placeholder={formatCents(priceRange.minCents).replace("$", "")}
            className="mt-1.5 h-9 w-24 border border-border bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-accent"
          />
        </div>

        <div>
          <label
            htmlFor="max"
            className="text-xs tracking-wide text-muted-foreground uppercase"
          >
            Max price
          </label>
          <input
            id="max"
            name="max"
            inputMode="decimal"
            defaultValue={params.max ?? ""}
            placeholder={formatCents(priceRange.maxCents).replace("$", "")}
            className="mt-1.5 h-9 w-24 border border-border bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-accent"
          />
        </div>

        {/* Keep the current category and sort when the form submits. */}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {sort !== "relevance" ? (
          <input type="hidden" name="sort" value={sort} />
        ) : null}

        <Button type="submit" variant="outline" size="sm" className="h-9">
          Apply
        </Button>
      </form>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={catalogHref(params, { category: undefined })}
            className={cn(
              "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
              !category
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={catalogHref(params, { category: c.slug })}
              className={cn(
                "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
                category === c.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <SortSelect value={sort} />
      </div>

      {hasFilters ? (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {q ? (
            <FilterChip href={catalogHref(params, { q: undefined })}>
              “{q}”
            </FilterChip>
          ) : null}
          {activeCategory ? (
            <FilterChip href={catalogHref(params, { category: undefined })}>
              {activeCategory.name}
            </FilterChip>
          ) : null}
          {minCents !== undefined ? (
            <FilterChip href={catalogHref(params, { min: undefined })}>
              from {formatCents(minCents)}
            </FilterChip>
          ) : null}
          {maxCents !== undefined ? (
            <FilterChip href={catalogHref(params, { max: undefined })}>
              up to {formatCents(maxCents)}
            </FilterChip>
          ) : null}
          <Link
            href="/products"
            className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              slug={product.slug}
              name={product.name}
              categoryName={product.category.name}
              basePriceCents={product.basePriceCents}
              image={product.images[0]}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {q ? `Nothing matches “${q}”.` : "No products match those filters."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a broader price range or a different category.
          </p>

          {suggestions.length > 0 ? (
            <div className="mt-8">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                You might mean
              </p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/products/${s.slug}`}
                      className="border border-border px-3 py-1.5 text-xs transition-colors hover:border-foreground"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="mt-8"
            render={<Link href="/products" />}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
