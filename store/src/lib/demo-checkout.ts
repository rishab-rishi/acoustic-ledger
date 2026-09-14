import type { ShippingAddressSnapshot } from "@/lib/settle-order";

/**
 * A second settlement path that produces a real order without PayPal.
 *
 * This exists because the demo is shown live to clients, and PayPal's sandbox
 * has already proven it can fail for reasons entirely outside this codebase —
 * an India-issued buyer account simply cannot pay, and PayPal reports that as
 * a generic "things don't appear to be working" (see PAYPAL_SETUP.md). Losing
 * checkout mid-pitch also loses everything downstream of it: confirmation,
 * order history, admin fulfilment.
 *
 * It marks orders paid without money moving, so it is fenced in three ways:
 *
 *   1. Off unless DEMO_CHECKOUT_FALLBACK=1 is explicitly set. The route 404s
 *      otherwise, so an unset environment doesn't merely hide the button —
 *      the endpoint does not function.
 *   2. Refused unless PAYPAL_API_BASE points at the sandbox. This is a
 *      whitelist, not a blacklist: anything that isn't recognisably sandbox
 *      counts as live. A real-money configuration cannot self-settle even if
 *      the flag is switched on by mistake.
 *   3. Every order it creates is stamped with a DEMO- capture id, so no
 *      inspection of the database can confuse one with a genuine payment.
 *
 * It deliberately does NOT exercise the PayPal integration and must never be
 * how we verify payments work — that's the sandbox run and verify-settlement.ts.
 */
export const DEMO_CAPTURE_PREFIX = "DEMO-";

function isSandboxPaypal(): boolean {
  const base = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
  try {
    // Exact hostname match, not a substring check — `.includes()` would also
    // accept "https://evil.example.com/sandbox.paypal.com". The value is an
    // environment variable, not attacker input, but the whole point of this
    // function is to be a whitelist that cannot be tricked.
    return new URL(base).hostname === "api-m.sandbox.paypal.com";
  } catch {
    return false; // unparseable counts as live
  }
}

export function isDemoCheckoutEnabled(): boolean {
  return process.env.DEMO_CHECKOUT_FALLBACK === "1" && isSandboxPaypal();
}

/**
 * The real flow snapshots the payer's address off PayPal's capture response
 * (`shipping_preference: GET_FROM_FILE`). There's no payer here, so the demo
 * supplies a stand-in — otherwise the confirmation page and the admin order
 * view would render an order with nowhere to ship it.
 */
export const DEMO_SHIPPING_ADDRESS: ShippingAddressSnapshot = {
  name: "Demo Buyer",
  line1: "1 Signal Path",
  line2: null,
  city: "Portland",
  region: "OR",
  postal: "97209",
  country: "US",
};
