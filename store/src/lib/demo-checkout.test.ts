import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_CAPTURE_PREFIX, isDemoCheckoutEnabled } from "./demo-checkout";

/**
 * The demo fallback marks orders paid without money moving. These tests pin the
 * three fences described in lib/demo-checkout.ts, because a regression here is
 * the difference between a demo aid and a free-goods endpoint.
 */
describe("isDemoCheckoutEnabled", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.DEMO_CHECKOUT_FALLBACK;
    delete process.env.PAYPAL_API_BASE;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("is off by default", () => {
    expect(isDemoCheckoutEnabled()).toBe(false);
  });

  it("is off when the flag is anything other than exactly '1'", () => {
    process.env.PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
    for (const value of ["", "0", "true", "yes", "TRUE", " 1"]) {
      process.env.DEMO_CHECKOUT_FALLBACK = value;
      expect(isDemoCheckoutEnabled()).toBe(false);
    }
  });

  it("is on with the flag set against the sandbox", () => {
    process.env.DEMO_CHECKOUT_FALLBACK = "1";
    process.env.PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
    expect(isDemoCheckoutEnabled()).toBe(true);
  });

  it("refuses to self-settle against live PayPal even with the flag on", () => {
    process.env.DEMO_CHECKOUT_FALLBACK = "1";
    process.env.PAYPAL_API_BASE = "https://api-m.paypal.com";
    expect(isDemoCheckoutEnabled()).toBe(false);
  });

  it("treats an unrecognised base as live, not sandbox", () => {
    process.env.DEMO_CHECKOUT_FALLBACK = "1";
    for (const base of ["https://example.com", "https://api-m.paypal.com/v2", ""]) {
      process.env.PAYPAL_API_BASE = base;
      expect(isDemoCheckoutEnabled()).toBe(false);
    }
  });

  it("stamps demo settlements with a recognisable prefix", () => {
    expect(DEMO_CAPTURE_PREFIX).toBe("DEMO-");
  });
});
