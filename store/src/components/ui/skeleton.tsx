import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // Decorative: the surrounding region carries role="status", so each
      // individual bar shouldn't also announce itself.
      aria-hidden
      className={cn("animate-pulse bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
