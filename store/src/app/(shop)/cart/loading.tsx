import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div
      role="status"
      aria-label="Loading cart"
      className="mx-auto max-w-4xl px-6 py-12"
    >
      <Skeleton className="h-8 w-24" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-border pb-4">
              <Skeleton className="size-24 shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-4 h-9 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        <div className="h-fit border border-border p-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
