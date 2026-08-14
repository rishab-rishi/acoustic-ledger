import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getCartId } from "@/lib/cart";
import { paypalAmountToCents, paypalFetch } from "@/lib/paypal";
import { settleOrder } from "@/lib/settle-order";

const bodySchema = z.object({ paypalOrderId: z.string().min(1).max(64) });

type PaypalAddress = {
  address_line_1?: string;
  address_line_2?: string;
  admin_area_1?: string; // state / province
  admin_area_2?: string; // city
  postal_code?: string;
  country_code?: string;
};

type CaptureResponse = {
  id: string;
  status: string;
  purchase_units?: Array<{
    shipping?: {
      name?: { full_name?: string };
      address?: PaypalAddress;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { currency_code: string; value: string };
        custom_id?: string;
      }>;
    };
  }>;
};

/**
 * Called by the PayPal button's `onApprove`. This is the primary settlement
 * path — unlike Stripe, the webhook is only the fallback for when the browser
 * dies mid-capture.
 *
 * The client tells us which *PayPal* order it approved, and nothing else is
 * taken on trust. Which internal order that maps to, and how much was actually
 * paid, are both read back out of PayPal's own capture response. Without that,
 * a payer could approve a cheap order and point the capture at an expensive
 * one.
 */
export async function POST(req: Request) {
  let paypalOrderId: string;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    paypalOrderId = parsed.data.paypalOrderId;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const cartId = await getCartId();

    const capture = await paypalFetch<CaptureResponse>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      {
        method: "POST",
        headers: { "PayPal-Request-Id": `capture-${paypalOrderId}` },
        body: "{}",
      }
    );

    const unit = capture.purchase_units?.[0];
    const captureDetail = unit?.payments?.captures?.[0];

    if (capture.status !== "COMPLETED" || captureDetail?.status !== "COMPLETED") {
      return Response.json(
        { error: "Payment was not completed." },
        { status: 402 }
      );
    }

    // Authoritative linkage: PayPal tells us which internal order this is.
    const internalOrderId = captureDetail.custom_id;
    if (!internalOrderId) {
      console.error("[paypal] capture missing custom_id", capture.id);
      return Response.json({ error: "Payment could not be matched." }, { status: 422 });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, internalOrderId),
    });
    if (!order) {
      console.error("[paypal] custom_id has no order row", internalOrderId);
      return Response.json({ error: "Payment could not be matched." }, { status: 422 });
    }

    // Compare in cents; never let a float decide whether an order is paid.
    const paidCents = captureDetail.amount
      ? paypalAmountToCents(captureDetail.amount.value)
      : null;
    if (paidCents === null || paidCents !== order.totalCents) {
      console.error(
        `[paypal] amount mismatch on order ${order.id}: paid ${paidCents}, expected ${order.totalCents}`
      );
      return Response.json(
        { error: "Payment amount did not match the order." },
        { status: 422 }
      );
    }

    // Snapshot the delivery address onto the order, same reasoning as the
    // line-item snapshot: it must reflect the moment of purchase.
    const shipping = unit?.shipping;
    const address = shipping?.address;

    // Only clear the cart if it's the buyer's own; a webhook-driven settle
    // has no cart context and leaves it alone.
    const outcome = await settleOrder({
      orderId: order.id,
      captureId: captureDetail.id,
      cartId,
      shippingAddress: address
        ? {
            name: shipping?.name?.full_name ?? null,
            line1: address.address_line_1 ?? null,
            line2: address.address_line_2 ?? null,
            city: address.admin_area_2 ?? null,
            region: address.admin_area_1 ?? null,
            postal: address.postal_code ?? null,
            country: address.country_code ?? null,
          }
        : null,
    });

    return Response.json({
      ok: true,
      orderId: order.id,
      alreadySettled: !outcome.settled,
    });
  } catch (err) {
    console.error("[paypal] capture failed:", err);
    return Response.json(
      { error: "Couldn't complete the payment. Please try again." },
      { status: 500 }
    );
  }
}
