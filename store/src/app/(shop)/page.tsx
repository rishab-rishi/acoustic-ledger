import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { LedReadout, PanelMotif, Rivets, SilkLabel } from "@/components/shop/rack";
import { getCategoriesWithMeta, getFeaturedProducts } from "@/db/queries";
import { formatCents } from "@/lib/format";

/** A vertical rack rail with punched, threaded screw holes, framing the stack. */
function RackRail() {
  return (
    <div
      className="hidden w-6 shrink-0 flex-col items-center justify-around bg-panel-raised py-5 shadow-[inset_-2px_0_4px_rgba(0,0,0,.5),inset_2px_0_2px_rgba(255,255,255,.03)] sm:flex"
      aria-hidden
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="size-2.5 rounded-full bg-panel-sunken shadow-[inset_0_1.5px_2px_rgba(0,0,0,.85),0_1px_0_rgba(255,255,255,.05)]"
        />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategoriesWithMeta(),
    getFeaturedProducts(6),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <SilkLabel as="h1" className="text-[13px]">
          The rack — {categories.length} sections
        </SilkLabel>
        <Link
          href="/products"
          className="silkscreen transition-colors hover:text-accent"
        >
          Browse all →
        </Link>
      </div>

      {/* The rack: five category faceplates between two rails, one rack-unit
          row each. */}
      <div className="flex items-stretch">
        <RackRail />
        <div className="min-w-0 flex-1 space-y-2.5 sm:px-2.5">
          {categories.map((category, i) => {
            const caption = category.description?.split(/(?<=\.)\s/)[0] ?? "";
            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="panel group relative grid grid-cols-1 gap-y-3 p-4 transition-colors hover:border-border-strong focus-visible:border-accent sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-6 sm:p-6"
              >
                <Rivets />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="font-condensed text-2xl font-bold uppercase leading-none tracking-[0.04em] text-foreground sm:text-3xl">
                      {category.name}
                    </h2>
                    <LedReadout tone="neutral" className="text-sm sm:text-base">
                      {String(category.productCount).padStart(2, "0")}
                    </LedReadout>
                  </div>
                  <p className="mt-2 max-w-md font-sans text-[13px] leading-relaxed text-muted-foreground">
                    {caption}
                  </p>
                </div>

                <PanelMotif index={i} className="hidden justify-self-center sm:block" />

                <div className="flex items-center gap-4 border-t border-border pt-3 sm:flex-col sm:items-end sm:gap-1.5 sm:border-t-0 sm:pt-0">
                  <SilkLabel>from {formatCents(category.priceFromCents)}</SilkLabel>
                  <span className="ml-auto flex items-center gap-1.5 silkscreen transition-colors group-hover:text-accent sm:ml-0">
                    Open
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <RackRail />
      </div>

      {featured.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-3">
            <span className="led-dot" aria-hidden />
            <SilkLabel as="h2" className="text-[13px]">
              Now loaded — featured units
            </SilkLabel>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
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
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
