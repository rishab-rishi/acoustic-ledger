import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  LOW_STOCK_THRESHOLD,
  getDashboardStats,
  getLowStockVariants,
  getRecentOrders,
  getTopProducts,
} from "@/db/admin-queries";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="border border-border p-5 transition-colors data-[link]:hover:border-accent" data-link={href ? "" : undefined}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboardPage() {
  const [stats, recent, lowStock, top] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(),
    getLowStockVariants(),
    getTopProducts(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-medium tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue"
          value={formatCents(stats.revenueCents)}
          hint={`${stats.paidOrderCount} paid ${stats.paidOrderCount === 1 ? "order" : "orders"}`}
        />
        <Stat
          label="Awaiting fulfilment"
          value={String(stats.awaitingFulfilment)}
          hint={stats.awaitingFulfilment > 0 ? "Needs shipping" : "All caught up"}
          href="/admin/orders?status=paid"
        />
        <Stat
          label="Low stock"
          value={String(stats.lowStockCount)}
          hint={`${LOW_STOCK_THRESHOLD} or fewer units`}
          href="/admin/products"
        />
        <Stat
          label="Active products"
          value={String(stats.activeProductCount)}
          hint={`${stats.pendingCount} pending · ${stats.cancelledCount} cancelled`}
          href="/admin/products?active=active"
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              Recent orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs text-muted-foreground transition-colors hover:text-accent"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="border border-border p-5 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {order.id.slice(0, 8)}
                      </p>
                      <p className="truncate text-sm">{order.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {dateFormatter.format(order.createdAt)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <span className="w-20 text-right font-mono text-sm tabular-nums">
                        {formatCents(order.totalCents)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">
              Low stock
            </h2>
            {lowStock.length === 0 ? (
              <p className="border border-border p-5 text-sm text-muted-foreground">
                Everything is above {LOW_STOCK_THRESHOLD} units.
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {lowStock.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/admin/products/${v.productId}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{v.productName}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {v.sku}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          v.stock === 0 ? "text-destructive" : ""
                        }`}
                      >
                        {v.stock}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">
              Best sellers
            </h2>
            {top.length === 0 ? (
              <p className="border border-border p-5 text-sm text-muted-foreground">
                No sales yet.
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {top.map((p) => (
                  <li
                    key={p.productName}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {p.productName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.units} sold ·{" "}
                      <span className="font-mono tabular-nums">
                        {formatCents(p.revenueCents)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
