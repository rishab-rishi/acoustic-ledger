import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { getAdminOrder } from "@/db/admin-queries";
import { formatCents } from "@/lib/format";
import type { ShippingAddressSnapshot } from "@/lib/settle-order";

export const metadata: Metadata = { title: "Order" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Postgres raises on a malformed uuid, so reject it before querying.
  if (!UUID_RE.test(id)) notFound();

  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = order.shippingAddress as ShippingAddressSnapshot | null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl tracking-tight">
            {order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFormatter.format(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 border border-border p-5">
        <OrderActions orderId={order.id} status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
            Customer
          </h2>
          <div className="border border-border p-4">
            <p className="text-sm">{order.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.user
                ? `Account${order.user.name ? ` · ${order.user.name}` : ""}`
                : "Guest checkout"}
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
            Ship to
          </h2>
          <div className="border border-border p-4 text-sm">
            {address ? (
              <address className="not-italic">
                {address.name ? <p>{address.name}</p> : null}
                {address.line1 ? <p>{address.line1}</p> : null}
                {address.line2 ? <p>{address.line2}</p> : null}
                <p>
                  {[address.city, address.region, address.postal]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {address.country ? <p>{address.country}</p> : null}
              </address>
            ) : (
              <p className="text-muted-foreground">
                No address — captured from PayPal at payment.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
          Items
        </h2>
        <ul className="divide-y divide-border border border-border">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                {/* Snapshotted at purchase — deliberately not re-joined to the
                    catalog, so renaming or repricing a product later can't
                    rewrite what this customer actually bought. */}
                <p className="truncate text-sm">{item.productName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.variantName} · {formatCents(item.unitPriceCents)} × {item.qty}
                  {item.variantId ? null : " · variant deleted"}
                </p>
              </div>
              <p className="font-mono text-sm tabular-nums">
                {formatCents(item.unitPriceCents * item.qty)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 ml-auto max-w-xs">
          <Row
            label="Subtotal"
            value={
              <span className="font-mono tabular-nums">
                {formatCents(order.subtotalCents)}
              </span>
            }
          />
          <Row
            label="Shipping"
            value={
              <span className="font-mono tabular-nums">
                {order.shippingCents === 0
                  ? "Free"
                  : formatCents(order.shippingCents)}
              </span>
            }
          />
          <div className="mt-1 border-t border-border pt-1">
            <Row
              label="Total"
              value={
                <span className="font-mono font-medium tabular-nums">
                  {formatCents(order.totalCents)}
                </span>
              }
            />
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
          Payment
        </h2>
        <dl className="border border-border px-4 py-2">
          <Row
            label="PayPal order"
            value={
              <span className="font-mono text-xs">
                {order.paypalOrderId ?? "—"}
              </span>
            }
          />
          <Row
            label="Capture"
            value={
              <span className="font-mono text-xs">
                {order.paypalCaptureId ?? "—"}
              </span>
            }
          />
        </dl>
        {order.paypalCaptureId?.startsWith("DEMO-") ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Settled by the demo fallback — no payment was taken.
          </p>
        ) : null}
      </section>
    </div>
  );
}
