import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { OrderStatusPoller } from "@/components/shop/order-status-poller";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = {
  title: "Order Confirmation",
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) notFound();

  // A signed-in user may only see their own orders. Guest orders have no
  // userId, so the id in the URL is the only key — which is why it's a UUID.
  const session = await auth();
  if (order.userId && order.userId !== session?.user?.id) {
    notFound();
  }

  const isPending = order.status === "pending";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="flex items-center gap-3 font-condensed text-3xl font-bold uppercase tracking-[0.02em] text-foreground">
        <span
          className="led-dot shrink-0"
          style={
            isCancelled
              ? { background: "var(--ramp-1)" }
              : isPending
                ? { background: "var(--ramp-2)" }
                : { background: "var(--ramp-4)" }
          }
          aria-hidden
        />
        {isPending
          ? "Almost there"
          : isCancelled
            ? "This order was cancelled"
            : "Order confirmed"}
      </h1>

      {isPending ? (
        <OrderStatusPoller />
      ) : (
        <p className="mt-3 font-sans text-sm text-muted-foreground">
          A receipt is on its way to {order.email}.
        </p>
      )}

      <div className="panel relative mt-10">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
          <span className="silkscreen">Order</span>
          <span className="font-mono text-xs text-foreground">
            {order.id.slice(0, 8)}
          </span>
        </div>

        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">{item.productName}</p>
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

        <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono tabular-nums">
              {formatCents(order.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="font-mono tabular-nums">
              {order.shippingCents === 0
                ? "Free"
                : formatCents(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-medium">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">
              {formatCents(order.totalCents)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" render={<Link href="/products" />}>
          Keep shopping
        </Button>
        {session?.user ? (
          <Button render={<Link href="/orders" />}>View order history</Button>
        ) : null}
      </div>
    </div>
  );
}
