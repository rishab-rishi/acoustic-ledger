import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { PriceRail } from "@/components/shop/price-rail";
import { ProductCard } from "@/components/shop/product-card";
import { DeadKeys, SilkLabel } from "@/components/shop/rack";
import { SortSelect } from "@/components/shop/sort-select";
import { Button } from "@/components/ui/button";
import {
  getCachedCategories,
  getCachedCategoryBySlug,
  getCachedPriceRange,
  getCachedSuggestions,
  searchProductsCached,
} from "@/db/cached-queries";
import { DEFAULT_PAGE_SIZE, isSort } from "@/db/queries";
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
    const found = await getCachedCategoryBySlug(category);
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
      className="inline-flex items-center gap-1.5 border border-border bg-panel px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
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

  // A garbage or missing ?page just means page 1 — never an error page.
  // searchProducts() clamps its own limit regardless, but there's no reason
  // to ask for a negative or absurd offset in the first place.
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const [categories, { products, total }, priceRange] = await Promise.all([
    getCachedCategories(),
    searchProductsCached({
      q,
      category,
      minCents,
      maxCents,
      sort,
      limit: DEFAULT_PAGE_SIZE,
      offset: (page - 1) * DEFAULT_PAGE_SIZE,
    }),
    getCachedPriceRange(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  const activeCategory = categories.find((c) => c.slug === category);
  const hasFilters = Boolean(q || category || minCents !== undefined || maxCents !== undefined);

  // Only worth a round trip when the search itself came back empty — not
  // just this page of it.
  const suggestions = total === 0 && q ? await getCachedSuggestions(q) : [];

  const heading = q
    ? `Results — “${q}”`
    : (activeCategory?.name ?? "All Units");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-[0.04em] text-foreground sm:text-3xl">
          {heading}
        </h1>
        <span className="led-readout text-sm">
          {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* The channel strip. The price fader marks the rack live (JS); the text
          boxes are the no-JS path. All of it lands in the URL, so results stay
          shareable and the back button behaves. */}
      <div className="panel relative mb-4 grid items-end gap-x-8 gap-y-4 p-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <form action="/products" className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="q" className="silkscreen block">
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
                className="panel-inset h-9 w-full pr-3 pl-9 font-mono text-sm text-foreground outline-none focus-visible:border-accent"
              />
            </div>
          </div>
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : null}
          {sort !== "relevance" ? (
            <input type="hidden" name="sort" value={sort} />
          ) : null}
          {minCents !== undefined ? (
            <input type="hidden" name="min" value={params.min} />
          ) : null}
          {maxCents !== undefined ? (
            <input type="hidden" name="max" value={params.max} />
          ) : null}
          <Button type="submit" size="sm" className="h-9">
            Go
          </Button>
        </form>

        <PriceRail
          params={params}
          floorCents={priceRange.minCents}
          ceilCents={priceRange.maxCents}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={catalogHref(params, { category: undefined })}
            className={cn(
              "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              !category
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border bg-panel text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={catalogHref(params, { category: c.slug })}
              className={cn(
                "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                category === c.slug
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-panel text-muted-foreground hover:border-border-strong hover:text-foreground"
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <SortSelect value={sort} />
      </div>

      {hasFilters ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <SilkLabel>Patched</SilkLabel>
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
            className="font-mono text-[11px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-accent"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="space-y-3" data-price-scope>
          {products.map((product) => (
            <div
              key={product.id}
              data-price={Math.round(product.basePriceCents / 100)}
              className="transition-[opacity,filter] duration-150"
            >
              <ProductCard
                slug={product.slug}
                name={product.name}
                categoryName={product.category.name}
                basePriceCents={product.basePriceCents}
                priceMinCents={product.priceMinCents}
                priceMaxCents={product.priceMaxCents}
                totalStock={product.totalStock}
                variantNames={product.variantNames}
                image={product.images[0]}
              />
            </div>
          ))}
        </div>
      ) : total > 0 ? (
        <div className="panel relative px-6 py-14 text-center">
          <p className="font-condensed text-lg font-semibold uppercase tracking-[0.04em] text-foreground">
            Nothing on page {page}
          </p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            There {total === 1 ? "is" : "are"} only {pageCount}{" "}
            {pageCount === 1 ? "page" : "pages"} of results.
          </p>
          <Link
            href={catalogHref(params, { page: undefined })}
            className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-accent underline underline-offset-4"
          >
            Back to page 1
          </Link>
        </div>
      ) : (
        <div className="panel relative px-6 py-14 text-center">
          {/* An empty pattern is sixteen dark keys of invitation. */}
          <DeadKeys />
          <p className="mt-6 font-condensed text-lg font-semibold uppercase tracking-[0.04em] text-foreground">
            {q ? `Nothing patched to “${q}”` : "No units match those filters"}
          </p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Widen the price range or clear a filter to load the rack.
          </p>

          {suggestions.length > 0 ? (
            <div className="mt-8">
              <SilkLabel>You might mean</SilkLabel>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/products/${s.slug}`}
                      className="border border-border bg-panel px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:border-accent"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button size="sm" className="mt-8" render={<Link href="/products" />}>
            Clear filters
          </Button>
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
          <Link
            href={catalogHref(params, { page: page > 1 ? String(page - 1) : undefined })}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              page <= 1
                ? "pointer-events-none text-muted-foreground/40"
                : "text-foreground hover:text-accent"
            )}
          >
            ← Prev
          </Link>
          <SilkLabel>
            Page {page} of {pageCount}
          </SilkLabel>
          <Link
            href={catalogHref(params, { page: String(page + 1) })}
            aria-disabled={page >= pageCount}
            tabIndex={page >= pageCount ? -1 : undefined}
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              page >= pageCount
                ? "pointer-events-none text-muted-foreground/40"
                : "text-foreground hover:text-accent"
            )}
          >
            Next →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
