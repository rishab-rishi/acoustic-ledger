import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div
      role="status"
      aria-label="Loading order history"
      className="mx-auto max-w-3xl px-6 py-12"
    >
      <Skeleton className="h-8 w-44" />

      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="space-y-3 px-5 py-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
