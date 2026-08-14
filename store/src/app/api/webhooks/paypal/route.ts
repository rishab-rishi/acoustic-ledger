import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { paypalAmountToCents, paypalFetch } from "@/lib/paypal";
import { settleOrder } from "@/lib/settle-order";

type WebhookEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    custom_id?: string;
    status?: string;
    amount?: { currency_code: string; value: string };
  };
};

/**
 * Reconciliation path. The capture route normally settles the order first;
 * this exists for when the browser dies between approval and capture, and for
 * PayPal's retries.
 *
 * Unlike Stripe's local HMAC check, verification is a network round-trip to
 * PayPal, so this needs the raw body — never a parsed-and-restringified one,
 * whose key order and whitespace would differ and fail the signature.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID is not set — rejecting webhook.");
    return new Response("Webhook not configured", { status: 500 });
  }

  let event: WebhookEvent;
  try {
    const verification = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      }
    );

    if (verification.verification_status !== "SUCCESS") {
      // Dashboard simulator events legitimately land here — they're signed
      // with a different webhook id and can't verify. That's not a bug.
      console.warn("[paypal] webhook signature not verified — ignoring.");
      return new Response("Invalid signature", { status: 401 });
    }

    event = JSON.parse(rawBody) as WebhookEvent;
  } catch (err) {
    console.error("[paypal] webhook verification error:", err);
    return new Response("Verification failed", { status: 400 });
  }

  // Anything else is acknowledged so PayPal stops retrying it.
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return Response.json({ received: true, ignored: event.event_type });
  }

  try {
    const internalOrderId = event.resource?.custom_id;
    if (!internalOrderId) {
      console.error("[paypal] webhook capture missing custom_id", event.id);
      return Response.json({ received: true, matched: false });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, internalOrderId),
    });
    if (!order) {
      console.error("[paypal] webhook custom_id has no order", internalOrderId);
      return Response.json({ received: true, matched: false });
    }

    // Same amount check as the capture route — a webhook is no more
    // trustworthy about totals than a browser is.
    const paidCents = event.resource?.amount
      ? paypalAmountToCents(event.resource.amount.value)
      : null;
    if (paidCents !== order.totalCents) {
      console.error(
        `[paypal] webhook amount mismatch on order ${order.id}: ${paidCents} vs ${order.totalCents}`
      );
      return Response.json({ received: true, matched: false });
    }

    // No cart context here: if the capture route already ran it cleared the
    // cart, and if it didn't, the buyer's cookie still owns that cart.
    const outcome = await settleOrder({
      orderId: order.id,
      captureId: event.resource?.id ?? null,
      cartId: null,
    });

    return Response.json({ received: true, settled: outcome.settled });
  } catch (err) {
    // 500 asks PayPal to redeliver; settleOrder is idempotent so that's safe.
    console.error("[paypal] webhook handling failed:", err);
    return new Response("Handler error", { status: 500 });
  }
}
