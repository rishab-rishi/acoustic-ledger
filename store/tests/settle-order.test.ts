import { describe, expect, it } from "vitest";
import { settleOrder } from "@/lib/settle-order";
import { makePendingOrder, makeVariant, orderRow, stockOf } from "./fixtures";

/**
 * Settlement is the one place where a race costs real inventory: the PayPal
 * capture route and the webhook both call settleOrder(), they can arrive
 * together, and PayPal redelivers webhooks it thinks failed.
 *
 * Needs a reachable DATABASE_URL (docker compose up -d).
 */
describe("settleOrder", () => {
  it("marks the order paid, decrements stock and stores the capture id", async () => {
    const { variant } = await makeVariant(10);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 3,
      unitPriceCents: 10_000,
    });

    const outcome = await settleOrder({ orderId: order.id, captureId: "CAP-1" });

    expect(outcome).toEqual({ settled: true });
    expect(await stockOf(variant.id)).toBe(7);

    const row = await orderRow(order.id);
    expect(row?.status).toBe("paid");
    expect(row?.paypalCaptureId).toBe("CAP-1");
  });

  it("is idempotent: a second settle changes nothing", async () => {
    const { variant } = await makeVariant(10);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 3,
      unitPriceCents: 10_000,
    });

    await settleOrder({ orderId: order.id, captureId: "CAP-FIRST" });
    const second = await settleOrder({ orderId: order.id, captureId: "CAP-SECOND" });

    expect(second).toEqual({ settled: false, reason: "already-settled" });
    // The webhook arriving after the capture must not decrement stock again...
    expect(await stockOf(variant.id)).toBe(7);
    // ...nor overwrite the capture id the real payment recorded.
    expect((await orderRow(order.id))?.paypalCaptureId).toBe("CAP-FIRST");
  });

  it("has exactly one winner when capture and webhook race", async () => {
    const { variant } = await makeVariant(10);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 4,
      unitPriceCents: 10_000,
    });

    const outcomes = await Promise.all([
      settleOrder({ orderId: order.id, captureId: "CAP-A" }),
      settleOrder({ orderId: order.id, captureId: "CAP-B" }),
      settleOrder({ orderId: order.id, captureId: "CAP-C" }),
    ]);

    expect(outcomes.filter((o) => o.settled)).toHaveLength(1);
    expect(await stockOf(variant.id)).toBe(6);
  });

  it("reports not-found for an order id that does not exist", async () => {
    const outcome = await settleOrder({
      orderId: crypto.randomUUID(),
      captureId: "CAP-X",
    });
    expect(outcome).toEqual({ settled: false, reason: "not-found" });
  });

  it("decrements every line of a multi-line order", async () => {
    const a = await makeVariant(5);
    const b = await makeVariant(8);

    const order = await makePendingOrder({
      variantId: a.variant.id,
      qty: 2,
      unitPriceCents: 10_000,
    });
    const { db } = await import("@/db");
    const { orderItems } = await import("@/db/schema");
    await db.insert(orderItems).values({
      orderId: order.id,
      variantId: b.variant.id,
      productName: "Product B",
      variantName: "Standard",
      unitPriceCents: 10_000,
      qty: 3,
    });

    await settleOrder({ orderId: order.id, captureId: "CAP-MULTI" });

    expect(await stockOf(a.variant.id)).toBe(3);
    expect(await stockOf(b.variant.id)).toBe(5);
  });

  it("clamps stock at zero rather than going negative on an oversell", async () => {
    // greatest(stock - qty, 0) in settleOrder. This documents the current
    // behaviour: the sale is honoured and inventory floors at zero. Note that
    // cancelling such an order later restocks the full qty, which inflates
    // stock by the oversold amount.
    const { variant } = await makeVariant(1);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 5,
      unitPriceCents: 10_000,
    });

    await settleOrder({ orderId: order.id, captureId: "CAP-OVER" });
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("leaves the capture id alone when none is supplied", async () => {
    const { variant } = await makeVariant(4);
    const order = await makePendingOrder({
      variantId: variant.id,
      qty: 1,
      unitPriceCents: 10_000,
    });

    await settleOrder({ orderId: order.id, captureId: null });

    const row = await orderRow(order.id);
    expect(row?.status).toBe("paid");
    expect(row?.paypalCaptureId).toBeNull();
  });
});
