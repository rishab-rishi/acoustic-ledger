import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/db/queries";

/**
 * 404 for storefront routes — a missing product slug, mostly.
 *
 * Unlike the root not-found this renders *inside* the (shop) layout, so the
 * header and footer are already mounted. Adding them here again would give
 * the page two of each.
 */
export default async function ShopNotFound() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
        404
      </p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be out of date, or the product may have been retired.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button render={<Link href="/products" />}>Browse the catalog</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Back to home
        </Button>
      </div>

      <div className="mt-12">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Or jump to a category
        </p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/products?category=${category.slug}`}
                className="border border-border px-3 py-1.5 text-xs transition-colors hover:border-foreground"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
