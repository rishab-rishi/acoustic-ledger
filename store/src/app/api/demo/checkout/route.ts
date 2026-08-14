import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCartId } from "@/lib/cart";
import {
  DEMO_CAPTURE_PREFIX,
  DEMO_SHIPPING_ADDRESS,
  isDemoCheckoutEnabled,
} from "@/lib/demo-checkout";
import { createPendingOrder } from "@/lib/pending-order";
import { settleOrder } from "@/lib/settle-order";

const bodySchema = z.object({
  email: z.email("Enter a valid email address.").optional(),
});

/**
 * Demo-only settlement. See lib/demo-checkout.ts for why this exists and the
 * three conditions that fence it in.
 *
 * The order itself is created by the same createPendingOrder() the real
 * checkout uses and settled by the same settleOrder(), so what lands in the
 * database is a genuine order in every respect except that no money moved.
 * That's the point: everything downstream — confirmation, history, stock,
 * admin fulfilment — is exercised for real.
 */
export async function POST(req: Request) {
  // 404 rather than 403: when disabled, this endpoint does not exist.
  if (!isDemoCheckoutEnabled()) {
    return new Response(null, { status: 404 });
  }

  let email: string | undefined;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    email = parsed.data.email;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const pending = await createPendingOrder(email);
    if (!pending.ok) {
      return Response.json({ error: pending.error }, { status: 400 });
    }

    const cartId = await getCartId();
    const captureId = `${DEMO_CAPTURE_PREFIX}${randomUUID()
      .replaceAll("-", "")
      .slice(0, 16)
      .toUpperCase()}`;

    console.warn(
      `[demo-checkout] settling order ${pending.order.id} without payment (${captureId})`
    );

    await settleOrder({
      orderId: pending.order.id,
      captureId,
      cartId,
      shippingAddress: DEMO_SHIPPING_ADDRESS,
    });

    return Response.json({ ok: true, orderId: pending.order.id });
  } catch (err) {
    console.error("[demo-checkout] failed:", err);
    return Response.json(
      { error: "Couldn't complete the demo checkout." },
      { status: 500 }
    );
  }
}
