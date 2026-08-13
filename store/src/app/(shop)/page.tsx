import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { getFeaturedProducts } from "@/db/queries";

export default async function HomePage() {
  const featured = await getFeaturedProducts(8);

  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
            Studio Monitors · Headphones · Equalizers
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-medium tracking-tight sm:text-5xl">
            High-fidelity gear, tuned to tell you the truth.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Neutral studio monitors and equalizers built for a balanced
            profile — accurate low end, no artificial boost. If it sounds
            good here, it will sound good everywhere else.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center border border-foreground px-6 py-3 text-sm font-medium tracking-wide transition-colors hover:bg-foreground hover:text-background"
          >
            Shop All Products
          </Link>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">Featured</h2>
            <Link
              href="/products"
              className="text-sm text-muted-foreground transition-colors hover:text-accent"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
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
        </section>
      ) : null}
    </div>
  );
}
