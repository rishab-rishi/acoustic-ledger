const API_BASE =
  process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

export const isPaypalConfigured = Boolean(
  process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
);

let cached: { token: string; expiresAt: number } | null = null;

/**
 * PayPal doesn't take the secret as a bearer token the way Stripe does — you
 * exchange client id + secret for a short-lived access token first. Tokens last
 * ~9 hours, so they're cached and refreshed a minute early to dodge clock skew.
 */
export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set — see PAYPAL_SETUP.md."
    );
  }

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PayPal token request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cached.token;
}

export async function paypalFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal ${path} failed (${res.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// --- Money -------------------------------------------------------------
// Everything in this codebase is integer cents (build spec §3, rule 3).
// PayPal speaks decimal strings. Convert only at the boundary, and compare
// in cents so no float ever decides whether an order is paid.

export function centsToPaypalAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function paypalAmountToCents(amount: string): number {
  return Math.round(Number.parseFloat(amount) * 100);
}

export type PaypalLineItem = {
  productName: string;
  variantName: string;
  qty: number;
  unitPriceCents: number;
};

/**
 * Builds the Orders v2 request body.
 *
 * Kept pure and separate from the action so it can be exercised against the
 * sandbox directly — PayPal rejects the whole order if `item_total` plus
 * `shipping` doesn't equal `amount.value` to the cent, and that's not a
 * failure you want to discover from a live demo.
 */
export function buildPaypalOrderPayload(params: {
  internalOrderId: string;
  items: PaypalLineItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  const { internalOrderId, items, subtotalCents, shippingCents, totalCents } =
    params;

  return {
    intent: "CAPTURE" as const,
    purchase_units: [
      {
        // How the capture and webhook find their way back to us.
        custom_id: internalOrderId,
        amount: {
          currency_code: "USD",
          value: centsToPaypalAmount(totalCents),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: centsToPaypalAmount(subtotalCents),
            },
            shipping: {
              currency_code: "USD",
              value: centsToPaypalAmount(shippingCents),
            },
          },
        },
        items: items.map((i) => ({
          name: i.productName.slice(0, 127),
          description: i.variantName.slice(0, 127),
          quantity: String(i.qty),
          unit_amount: {
            currency_code: "USD",
            value: centsToPaypalAmount(i.unitPriceCents),
          },
        })),
      },
    ],
    application_context: {
      brand_name: "Acoustic Ledger",
      // Use the address on the payer's PayPal account, which comes back on the
      // capture response and is snapshotted onto the order.
      shipping_preference: "GET_FROM_FILE",
      user_action: "PAY_NOW",
    },
  };
}

export const SHIPPING_FLAT_CENTS = 900;
export const FREE_SHIPPING_THRESHOLD_CENTS = 10_000;

/** Matches the rule used in the seed data: free shipping over $100. */
export function shippingForSubtotal(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}
