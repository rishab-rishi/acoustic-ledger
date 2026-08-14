"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getCart } from "@/lib/cart";
import {
  buildPaypalOrderPayload,
  paypalFetch,
  shippingForSubtotal,
} from "@/lib/paypal";

export type CreateOrderResult =
  | { ok: true; paypalOrderId: string }
  | { ok: false; error: string };

const createOrderSchema = z.object({
  // Only consulted for guests; signed-in users use their account email.
  email: z.email("Enter a valid email address.").optional(),
});

type PaypalOrderResponse = { id: string };

/**
 * Called by the PayPal button's `createOrder`. Builds our own pending order
 * first so its id can travel as `custom_id`, then asks PayPal for an order.
 *
 * Every amount here is computed from the database, never from the client —
 * that's the whole reason this runs server-side.
 */
export async function createPaypalOrder(
  input: unknown
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  try {
    const session = await auth();
    const user = session?.user;

    const email = user?.email ?? parsed.data.email;
    if (!email) {
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

    const [order] = await db
      .insert(orders)
      .values({
        userId: user?.id ?? null,
        email,
        status: "pending",
        subtotalCents,
        shippingCents,
        totalCents,
      })
      .returning();

    // Names and prices are snapshotted here and never joined back to products,
    // so later catalog edits can't rewrite order history (build spec §3 rule 2).
    await db.insert(orderItems).values(
      cart.items.map((i) => ({
        orderId: order.id,
        variantId: i.variantId,
        productName: i.variant.product.name,
        variantName: i.variant.name,
        unitPriceCents: i.variant.priceCents,
        qty: i.qty,
      }))
    );

    const paypalOrder = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          // Retrying the same internal order reuses PayPal's original result
          // instead of creating a duplicate order.
          "PayPal-Request-Id": `order-${order.id}`,
        },
        body: JSON.stringify(
          buildPaypalOrderPayload({
            internalOrderId: order.id,
            items: cart.items.map((i) => ({
              productName: i.variant.product.name,
              variantName: i.variant.name,
              qty: i.qty,
              unitPriceCents: i.variant.priceCents,
            })),
            subtotalCents,
            shippingCents,
            totalCents,
          })
        ),
      }
    );

    await db
      .update(orders)
      .set({ paypalOrderId: paypalOrder.id })
      .where(eq(orders.id, order.id));

    return { ok: true, paypalOrderId: paypalOrder.id };
  } catch (err) {
    console.error("[checkout] createPaypalOrder failed:", err);
    return { ok: false, error: "Couldn't start checkout. Please try again." };
  }
}
