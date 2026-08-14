"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { buildPaypalOrderPayload, paypalFetch } from "@/lib/paypal";
import { createPendingOrder } from "@/lib/pending-order";

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
    const pending = await createPendingOrder(parsed.data.email);
    if (!pending.ok) return pending;
    const { id, items, subtotalCents, shippingCents, totalCents } =
      pending.order;

    const paypalOrder = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          // Retrying the same internal order reuses PayPal's original result
          // instead of creating a duplicate order.
          "PayPal-Request-Id": `order-${id}`,
        },
        body: JSON.stringify(
          buildPaypalOrderPayload({
            internalOrderId: id,
            items,
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
      .where(eq(orders.id, id));

    return { ok: true, paypalOrderId: paypalOrder.id };
  } catch (err) {
    console.error("[checkout] createPaypalOrder failed:", err);
    return { ok: false, error: "Couldn't start checkout. Please try again." };
  }
}
