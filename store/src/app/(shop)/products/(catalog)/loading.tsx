import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lives inside the (catalog) route group on purpose.
 *
 * A loading.tsx creates a Suspense boundary over its segment *and everything
 * nested beneath it*. Sitting directly in products/ it also wrapped
 * products/[slug], so Next flushed the shell — committing a 200 — before the
 * slug was resolved. A missing product then rendered 404 content under a 200
 * status: a soft 404, which search engines index as a real page.
 *
 * The route group scopes the boundary to /products alone. The catalog itself
 * can never 404 (an unknown category is an empty result), so it's safe here.
 * Verified: /products/does-not-exist returns 404, not 200.
 */
export default function CatalogLoading() {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="mx-auto max-w-6xl px-6 py-12"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-24" />

      <div className="mt-8 flex flex-wrap gap-3">
        <Skeleton className="h-9 flex-1 min-w-56" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28" />
        ))}
      </div>

      {/* Same grid shape as the real results, so nothing jumps when they
          arrive. */}
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
