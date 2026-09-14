import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A delete endpoint with no auth and no rate limiting must not exist by
 * default. These pin the fence: unset CRON_SECRET 404s regardless of the
 * header, and a mismatched header is rejected even when the secret is set.
 */
const sweepStalePendingOrders = vi.fn();
vi.mock("@/lib/sweep-pending-orders", () => ({
  sweepStalePendingOrders: (...args: unknown[]) => sweepStalePendingOrders(...args),
}));

const { GET } = await import("./route");

function request(authHeader?: string) {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/cron/sweep-pending-orders", { headers });
}

describe("GET /api/cron/sweep-pending-orders", () => {
  beforeEach(() => {
    sweepStalePendingOrders.mockReset();
    sweepStalePendingOrders.mockResolvedValue({ removed: 0 });
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("404s when CRON_SECRET is unset, even with a bearer header sent", async () => {
    const res = await GET(request("Bearer anything"));
    expect(res.status).toBe(404);
    expect(sweepStalePendingOrders).not.toHaveBeenCalled();
  });

  it("401s when the secret is set but the header doesn't match", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const res = await GET(request("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(sweepStalePendingOrders).not.toHaveBeenCalled();
  });

  it("401s when the secret is set but no header is sent", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("runs the sweep and returns its count when the header matches", async () => {
    process.env.CRON_SECRET = "correct-secret";
    sweepStalePendingOrders.mockResolvedValue({ removed: 3 });

    const res = await GET(request("Bearer correct-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, removed: 3 });
  });
});
