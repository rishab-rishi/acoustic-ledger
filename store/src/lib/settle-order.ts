import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { carts, orderItems, orders, variants } from "@/db/schema";

export type SettleOutcome =
  | { settled: true }
  | { settled: false; reason: "already-settled" | "not-found" };

/**
 * Move an order from `pending` to `paid` exactly once.
 *
 * Both the capture route and the webhook call this, and they can race: the
 * browser's capture and PayPal's notification may arrive at the same moment,
 * and PayPal redelivers webhooks it thinks failed. The status transition is a
 * conditional UPDATE ... WHERE status = 'pending', so exactly one caller wins
 * the row. Stock is only decremented by that winner, which is what stops the
 * double-decrement the build spec warns about.
 */
export type ShippingAddressSnapshot = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postal: string | null;
  country: string | null;
};

export async function settleOrder(params: {
  orderId: string;
  captureId: string | null;
  cartId?: string | null;
  shippingAddress?: ShippingAddressSnapshot | null;
}): Promise<SettleOutcome> {
  const { orderId, captureId, cartId, shippingAddress } = params;

  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(orders)
      .set({
        status: "paid",
        ...(captureId ? { paypalCaptureId: captureId } : {}),
        ...(shippingAddress ? { shippingAddress } : {}),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    if (claimed.length === 0) {
      // Either someone else already settled it, or it doesn't exist. Both are
      // a no-op for us; the caller returns 200 so PayPal stops retrying.
      const existing = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      return {
        settled: false,
        reason: existing ? "already-settled" : "not-found",
      };
    }

    const lines = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    for (const line of lines) {
      if (!line.variantId) continue;

      // Locked for the rest of this transaction so a concurrent settlement
      // touching the same variant can't read a stock figure that's about to
      // change under it — the same correctness goal a single atomic
      // `UPDATE ... SET stock = GREATEST(stock - qty, 0)` had, but this also
      // needs the pre-decrement stock to record how much was actually taken
      // (see the stockDecrementedQty comment on the schema).
      const [variant] = await tx
        .select({ stock: variants.stock })
        .from(variants)
        .where(eq(variants.id, line.variantId))
        .for("update");

      // Clamped at 0 on an oversell — stock moving while people shop, or
      // two buyers racing the last unit, both land here rather than going
      // negative.
      const decremented = variant ? Math.min(line.qty, Math.max(variant.stock, 0)) : 0;

      if (variant) {
        await tx
          .update(variants)
          .set({ stock: variant.stock - decremented })
          .where(eq(variants.id, line.variantId));
      }

      // Recorded even when it equals qty, so cancelOrder() always has an
      // exact figure to restock rather than assuming qty was fully taken.
      await tx
        .update(orderItems)
        .set({ stockDecrementedQty: decremented })
        .where(eq(orderItems.id, line.id));
    }

    if (cartId) {
      // Cascades to cart_items. A guest's stale cookie then resolves to
      // nothing and a fresh cart is created on their next add.
      await tx.delete(carts).where(eq(carts.id, cartId));
    }

    return { settled: true };
  });
}
