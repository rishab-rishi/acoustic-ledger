import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { testId } from "./fixtures";

/**
 * createPendingOrder() wraps its order + order-item inserts in one
 * db.transaction() specifically so a failure between them can't leave a
 * `pending` order with no line items (see src/lib/pending-order.ts and
 * src/lib/pending-order.test.ts, which covers the same guarantee against a
 * mocked transaction).
 *
 * Forcing that exact failure through createPendingOrder()'s own code path
 * would need a variant to disappear between the cart read and the insert —
 * genuinely awkward to set up because the schema's own FKs block deleting a
 * variant or product while a cart still references it. This proves the same
 * atomicity property directly against real Postgres instead: run the
 * identical two-insert shape in one transaction, make the second insert
 * fail on a real foreign-key violation (a variant id that doesn't exist —
 * the same failure mode a disappearing variant would cause), and confirm
 * the order row the first insert created does not survive.
 *
 * Needs a reachable DATABASE_URL (docker compose up -d).
 */
describe("orders + order_items transaction", () => {
  it("leaves no order row behind when the line-item insert fails", async () => {
    const email = `${testId()}@example.test`;

    await expect(
      db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            email,
            status: "pending",
            subtotalCents: 1000,
            shippingCents: 0,
            totalCents: 1000,
          })
          .returning();

        await tx.insert(orderItems).values({
          orderId: order.id,
          variantId: "00000000-0000-0000-0000-000000000000",
          productName: "Ghost",
          variantName: "Ghost",
          unitPriceCents: 1000,
          qty: 1,
        });
      })
    ).rejects.toThrow();

    const row = await db.query.orders.findFirst({ where: eq(orders.email, email) });
    expect(row).toBeUndefined();
  });
});
