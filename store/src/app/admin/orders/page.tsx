import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type OrderStatus, getAdminOrders } from "@/db/admin-queries";
import { orderStatusEnum } from "@/db/schema";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const STATUSES = orderStatusEnum.enumValues;

function isStatus(value: string | undefined): value is OrderStatus {
  return !!value && (STATUSES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = isStatus(status) ? status : undefined;
  const rows = await getAdminOrders(active);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-medium tracking-tight">Orders</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={cn(
            "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
            !active
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={cn(
              "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
              active === s
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="border border-border p-8 text-center text-sm text-muted-foreground">
          {active ? `No ${active} orders.` : "No orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm">
                    {order.email}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dateFormatter.format(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {order.items.reduce((n, i) => n + i.qty, 0)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCents(order.totalCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
