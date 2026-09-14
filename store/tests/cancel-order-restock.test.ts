import { describe, expect, it, vi } from "vitest";

/**
 * cancelOrder() must restock exactly what settlement actually decremented,
 * not the ordered qty — otherwise cancelling an oversold order (settled for
 * more than was in stock) hands back more inventory than it ever took,
 * silently inflating stock. See settle-order.ts's stockDecrementedQty
 * comment and admin-orders.ts's cancelOrder.
 */
vi.mock("@/auth", () => ({ auth: async () => ({ user: { role: "admin" } }) }));
// revalidatePath/revalidateTag need a real Next.js request context, which
// this plain vitest environment doesn't have — cancelOrder()'s own
// refresh() calls them as a side effect unrelated to what's under test here.
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { settleOrder } = await import("@/lib/settle-order");
const { cancelOrder } = await import("@/actions/admin-orders");
const { makePendingOrder, makeVariant, stockOf } = await import("./fixtures");

describe("cancelOrder — restock symmetry with an oversell", () => {
  it("restocks only what was actually decremented, not the inflated ordered qty", async () => {
    const { variant } = await makeVariant(1); // only 1 in stock
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 5, // ordered 5 anyway — the re-check that would normally prevent
      // this raced past it, same scenario the oversell test in
      // settle-order.test.ts documents.
      unitPriceCents: 10_000,
    });

    await settleOrder({ orderId: order.id, captureId: "CAP-OVERSELL" });
    expect(await stockOf(variant.id)).toBe(0); // clamped, not negative

    const result = await cancelOrder({ orderId: order.id });

    expect(result.ok).toBe(true);
    // Must come back to 1 (what was actually taken), not 5 (what was
    // ordered) — the bug this fix closes would have restocked 5.
    expect(await stockOf(variant.id)).toBe(1);
  });

  it("restocks the full qty for an ordinary (non-oversold) cancellation", async () => {
    const { variant } = await makeVariant(10);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 3,
      unitPriceCents: 10_000,
    });

    await settleOrder({ orderId: order.id, captureId: "CAP-NORMAL" });
    expect(await stockOf(variant.id)).toBe(7);

    await cancelOrder({ orderId: order.id });

    expect(await stockOf(variant.id)).toBe(10);
  });
});
