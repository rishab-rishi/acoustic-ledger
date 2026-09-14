import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rate-limited capture request must 429 before ever calling PayPal — the
 * whole point is that a blocked request costs nothing outbound.
 */
const isRateLimited = vi.fn();
const paypalFetch = vi.fn();

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => isRateLimited(...args) }));
vi.mock("@/lib/paypal", () => ({
  paypalFetch: (...args: unknown[]) => paypalFetch(...args),
  paypalAmountToCents: (v: string) => Math.round(Number(v) * 100),
}));
vi.mock("@/lib/cart", () => ({ getCartId: async () => null }));
vi.mock("@/db", () => ({ db: { query: { orders: { findFirst: vi.fn() } } } }));
vi.mock("@/lib/settle-order", () => ({ settleOrder: vi.fn() }));

const { POST } = await import("./route");

describe("POST /api/paypal/capture — rate limiting", () => {
  beforeEach(() => {
    isRateLimited.mockReset();
    paypalFetch.mockReset();
  });

  it("returns 429 with Retry-After and never calls PayPal when limited", async () => {
    isRateLimited.mockResolvedValue(true);

    const req = new Request("https://example.com/api/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ paypalOrderId: "ORDER-1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(paypalFetch).not.toHaveBeenCalled();
  });

  it("checks the paypal-capture limit keyed by request headers", async () => {
    isRateLimited.mockResolvedValue(true);
    const req = new Request("https://example.com/api/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ paypalOrderId: "ORDER-1" }),
    });
    await POST(req);
    expect(isRateLimited).toHaveBeenCalledWith(
      "paypal-capture",
      expect.objectContaining({ headers: req.headers })
    );
  });
});
