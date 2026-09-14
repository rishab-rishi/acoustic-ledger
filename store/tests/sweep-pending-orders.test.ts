import { eq, ilike } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { sweepStalePendingOrders } from "@/lib/sweep-pending-orders";
import { testId } from "./fixtures";

/**
 * The seeded database has its own historical `pending` orders (see
 * src/db/seed.ts's CUSTOMER_ORDERS — deliberately backdated demo data, one
 * of them 5 days old). Every sweep call here passes an `extraFilter` scoping
 * it to this file's own vitest-prefixed rows, so a test run against a shared
 * local database can't delete real seed data — same discipline
 * tests/fixtures.ts documents for every other fixture.
 */
const scope = () => ilike(orders.email, "vitest-%");

async function makeOrder(status: "pending" | "paid", ageHours: number) {
  const createdAt = new Date(Date.now() - ageHours * 60 * 60 * 1000);
  const [order] = await db
    .insert(orders)
    .values({
      email: `${testId()}@example.test`,
      status,
      subtotalCents: 1000,
      shippingCents: 0,
      totalCents: 1000,
      createdAt,
      updatedAt: createdAt,
    })
    .returning();
  return order;
}

describe("sweepStalePendingOrders", () => {
  it("removes a pending order older than the cutoff", async () => {
    const stale = await makeOrder("pending", 25);

    const result = await sweepStalePendingOrders(24, scope());

    expect(result.removed).toBeGreaterThanOrEqual(1);
    const row = await db.query.orders.findFirst({ where: eq(orders.id, stale.id) });
    expect(row).toBeUndefined();
  });

  it("keeps a pending order within the window", async () => {
    const fresh = await makeOrder("pending", 1);

    await sweepStalePendingOrders(24, scope());

    const row = await db.query.orders.findFirst({ where: eq(orders.id, fresh.id) });
    expect(row).toBeDefined();
  });

  it("never removes a paid order regardless of age", async () => {
    const oldPaid = await makeOrder("paid", 999);

    await sweepStalePendingOrders(24, scope());

    const row = await db.query.orders.findFirst({ where: eq(orders.id, oldPaid.id) });
    expect(row).toBeDefined();
  });

  it("cascades to the swept order's line items", async () => {
    const stale = await makeOrder("pending", 48);
    await db.insert(orderItems).values({
      orderId: stale.id,
      variantId: null,
      productName: "Ghost",
      variantName: "Ghost",
      unitPriceCents: 1000,
      qty: 1,
    });

    await sweepStalePendingOrders(24, scope());

    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, stale.id),
    });
    expect(items).toHaveLength(0);
  });
});
