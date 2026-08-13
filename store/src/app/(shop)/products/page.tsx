import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { getCategories, getProducts } from "@/db/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All Products",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: activeCategory } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(activeCategory),
  ]);

  const activeCategoryName = categories.find(
    (c) => c.slug === activeCategory
  )?.name;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-medium tracking-tight">
          {activeCategoryName ?? "All Products"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="mb-10 flex flex-wrap gap-2">
        <Link
          href="/products"
          className={cn(
            "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
            !activeCategory
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className={cn(
              "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
              activeCategory === category.slug
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>

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
        <p className="py-16 text-center text-sm text-muted-foreground">
          No products in this category yet.
        </p>
      )}
    </div>
  );
}
