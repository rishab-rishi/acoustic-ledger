import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getCart } from "@/lib/cart";
import { type PaypalLineItem, shippingForSubtotal } from "@/lib/paypal";

export type PendingOrder = {
  id: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: PaypalLineItem[];
};

export type PendingOrderResult =
  | { ok: true; order: PendingOrder }
  | { ok: false; error: string };

/**
 * Turn the current cart into a `pending` order row with its line-item
 * snapshots, and return the amounts.
 *
 * This is deliberately payment-provider agnostic. The real checkout hands the
 * resulting id to PayPal as `custom_id`; the demo fallback settles it directly.
 * Both get the same validation, the same stock re-check and — the part that
 * matters — the same amounts, computed here from the database and never taken
 * from the client.
 */
export async function createPendingOrder(
  email?: string
): Promise<PendingOrderResult> {
  const session = await auth();
  const user = session?.user;

  const buyerEmail = user?.email ?? email;
  if (!buyerEmail) {
    return { ok: false, error: "An email address is required to check out." };
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  // Re-check availability at purchase time — stock moves while people shop.
  const unavailable = cart.items.find((i) => i.variant.stock < i.qty);
  if (unavailable) {
    const { product, name, stock } = unavailable.variant;
    return {
      ok: false,
      error:
        stock === 0
          ? `${product.name} (${name}) sold out — remove it to continue.`
          : `Only ${stock} left of ${product.name} (${name}). Reduce the quantity to continue.`,
    };
  }

  const subtotalCents = cart.items.reduce(
    (sum, i) => sum + i.qty * i.variant.priceCents,
    0
  );
  const shippingCents = shippingForSubtotal(subtotalCents);
  const totalCents = subtotalCents + shippingCents;

  // The order row and its line items must land together: if the item insert
  // failed after the order insert committed, that pending order would have
  // no lines, and if it ever somehow settled, settleOrder() would find
  // nothing to decrement stock for and still mark it paid.
  const order = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        userId: user?.id ?? null,
        email: buyerEmail,
        status: "pending",
        subtotalCents,
        shippingCents,
        totalCents,
      })
      .returning();

    // Names and prices are snapshotted here and never joined back to
    // products, so later catalog edits can't rewrite order history (build
    // spec §3 rule 2).
    await tx.insert(orderItems).values(
      cart.items.map((i) => ({
        orderId: order.id,
        variantId: i.variantId,
        productName: i.variant.product.name,
        variantName: i.variant.name,
        unitPriceCents: i.variant.priceCents,
        qty: i.qty,
      }))
    );

    return order;
  });

  return {
    ok: true,
    order: {
      id: order.id,
      subtotalCents,
      shippingCents,
      totalCents,
      items: cart.items.map((i) => ({
        productName: i.variant.product.name,
        variantName: i.variant.name,
        qty: i.qty,
        unitPriceCents: i.variant.priceCents,
      })),
    },
  };
}
