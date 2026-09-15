import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/shop/gallery";
import { VariantPicker } from "@/components/shop/variant-picker";
import { getCachedProductBySlug } from "@/db/cached-queries";
import { formatCents } from "@/lib/format";

// Tried generateStaticParams() returning [] to get ISR's "render on first
// request, then serve from cache" behavior without a build-time database
// call. It doesn't work here: the (shop) layout's <Header> reads the guest
// cart cookie (cookies()) to show the cart-count badge on every page in this
// route group, and that's a request-time API — Next refuses to produce a
// static shell for a page whose own layout is request-dependent
// (DYNAMIC_SERVER_USAGE, reproduced against a production build). Decoupling
// the header's cart badge from cookies() to unblock that is a bigger, more
// invasive change than this task's scope, so this page stays a dynamic
// render — but getCachedProductBySlug()'s tag-based Data Cache (see
// db/cached-queries.ts) still keeps the actual database query off the hot
// path, which is the change that matters for load.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) notFound();

  const prices = product.variants.map((v) => v.priceCents);
  const priceLo = Math.min(...prices);
  const priceHi = Math.max(...prices);

  const spec: [string, string][] = [
    ["Section", product.category.name],
    ["Variants", product.variants.map((v) => v.name).join(" · ")],
    [
      "Price range",
      priceLo === priceHi
        ? formatCents(priceLo)
        : `${formatCents(priceLo)} – ${formatCents(priceHi)}`,
    ],
  ];


  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <Link href="/products" className="transition-colors hover:text-accent">
          All Units
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="transition-colors hover:text-accent"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="panel relative grid gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:p-8">
        <div>
          <Gallery images={product.images} alt={product.name} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Illustrated rendering — not an exact photo
          </p>
        </div>

        <div className="flex flex-col">
          <h1 className="font-condensed text-3xl font-bold uppercase leading-[1.05] tracking-[0.02em] text-foreground sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <dl className="mt-6 border-t border-border">
            {spec.map(([term, value]) => (
              <div
                key={term}
                className="flex justify-between gap-6 border-b border-border py-2"
              >
                <dt className="silkscreen shrink-0 pt-0.5">{term}</dt>
                <dd className="text-right font-mono text-[13px] text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-7">
            <VariantPicker variants={product.variants} />
          </div>
        </div>
      </div>
    </div>
  );
}
