import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 inside the admin area — a deleted order or a mistyped id. Renders
 * within the admin layout, so the nav is already there.
 */
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
        404
      </p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        That record doesn&apos;t exist
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been deleted, or the id in the URL may be wrong.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button render={<Link href="/admin/orders" />}>Orders</Button>
        <Button variant="outline" render={<Link href="/admin/products" />}>
          Products
        </Button>
      </div>
    </div>
  );
}
