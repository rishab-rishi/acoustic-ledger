import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = {
  title: "Order History",
};

const STATUS_VARIANT = {
  pending: "outline",
  paid: "secondary",
  fulfilled: "default",
  cancelled: "destructive",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function OrdersPage() {
  const session = await auth();
  // proxy.ts already gates this route; this is the belt to that braces.
  if (!session?.user?.id) redirect("/login?callbackUrl=/orders");

  const history = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id),
    orderBy: desc(orders.createdAt),
    with: { items: true },
  });

  if (history.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-2xl font-medium tracking-tight">No orders yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Once you place an order it will show up here.
        </p>
        <Button className="mt-8" render={<Link href="/products" />}>
          Shop All Products
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-medium tracking-tight">Order History</h1>

      <div className="space-y-6">
        {history.map((order) => (
          <article key={order.id} className="border border-border">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFormatter.format(order.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[order.status]}>
                  {order.status}
                </Badge>
                <span className="font-mono text-sm tabular-nums">
                  {formatCents(order.totalCents)}
                </span>
              </div>
            </header>

            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-5 py-3">
                  <div>
                    {/* Snapshotted at purchase time — never re-joined to
                        products, so editing a price today can't rewrite this. */}
                    <p className="text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.variantName} · qty {item.qty}
                    </p>
                  </div>
                  <p className="font-mono text-sm tabular-nums">
                    {formatCents(item.unitPriceCents * item.qty)}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
