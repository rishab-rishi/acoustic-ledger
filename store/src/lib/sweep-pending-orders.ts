import { and, eq, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

/**
 * A new `pending` order row is written on every click of the PayPal button
 * (createPendingOrder() in pending-order.ts), including abandoned checkouts
 * that never approve or capture. Left alone these accumulate forever,
 * inflate the admin order list, and are a free way for anyone to grow the
 * database one click at a time.
 *
 * Deletes `pending` orders older than the cutoff. `order_items.order_id`
 * cascades on delete, so removing the order row is enough — no need to
 * delete its line items first. Never touches `paid`, `fulfilled` or
 * `cancelled` orders regardless of age; only `pending` ones are considered
 * abandoned.
 *
 * `extraFilter` is not used by the cron route — it exists so
 * tests/sweep-pending-orders.test.ts can scope a real delete to its own
 * fixture rows instead of touching the seed data's own historical pending
 * orders in a shared local database.
 */
export async function sweepStalePendingOrders(
  olderThanHours = 24,
  extraFilter?: SQL
) {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const conditions = [
    eq(orders.status, "pending"),
    lt(orders.createdAt, cutoff),
    extraFilter,
  ].filter(Boolean) as SQL[];

  const removed = await db
    .delete(orders)
    .where(and(...conditions))
    .returning({ id: orders.id });

  return { removed: removed.length };
}
