import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shop/footer";
import { Header } from "@/components/shop/header";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/db/queries";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Keep this. Next prerenders /_not-found at build time, and this page reads
 * the database — directly for the category shortcuts, and again through the
 * header and footer. That made `next build` require a reachable database,
 * which failed the first Vercel deploy outright (ECONNREFUSED against the
 * localhost default, because DATABASE_URL isn't set during a build).
 *
 * Even with the variable set it would be the wrong dependency: Neon scales to
 * zero, so a cold database could fail a deploy that has nothing to do with
 * it. Rendering per request keeps builds independent of the database.
 */
export const dynamic = "force-dynamic";

/**
 * Root 404. This renders outside the (shop) route group, so the storefront
 * chrome has to be mounted explicitly — otherwise a mistyped URL drops the
 * visitor onto a bare page with no way back into the store, which is exactly
 * the dead end this phase is meant to remove.
 */
export default async function NotFound() {
  const categories = await getCategories();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />

      <main className="flex-1">
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
      </main>

      <Footer />
    </div>
  );
}
