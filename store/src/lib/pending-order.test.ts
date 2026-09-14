import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderItems, orders } from "@/db/schema";

/**
 * The order row and its line items must land together. Before this task they
 * were two separate statements — a failure between them left a `pending`
 * order with no lines, which settleOrder() would then have nothing to
 * decrement stock for if it ever somehow got marked paid.
 *
 * This mocks db.transaction() rather than hitting Postgres, so it proves two
 * things directly from the code structure rather than from database
 * behavior: both inserts go through the same `tx` inside one
 * db.transaction() call (there is no `db.insert` in this mock at all — if
 * createPendingOrder() called it directly instead of through `tx`, this
 * would throw "db.insert is not a function"), and a failure partway through
 * propagates as a rejection instead of being swallowed into a partial
 * success.
 */
let failOrderItemsInsert = false;

vi.mock("@/auth", () => ({ auth: async () => null }));

vi.mock("@/lib/cart", () => ({
  getCart: async () => ({
    items: [
      {
        variantId: "variant-1",
        qty: 2,
        variant: {
          stock: 10,
          priceCents: 5_000,
          name: "Standard",
          product: { name: "Widget" },
        },
      },
    ],
  }),
}));

vi.mock("@/lib/paypal", () => ({ shippingForSubtotal: () => 0 }));

vi.mock("@/db", () => ({
  db: {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (rows: unknown) => {
            const run = async () => {
              if (table === orderItems && failOrderItemsInsert) {
                throw new Error("simulated line-item insert failure");
              }
              if (table === orders) {
                const row = rows as { email: string };
                return [{ id: "order-1", ...row }];
              }
              return undefined;
            };
            // Supports both `await tx.insert(x).values(y)` (orderItems, no
            // .returning()) and `.returning()` (orders) — same shape
            // createPendingOrder() actually uses.
            return { returning: run, then: (...args: Parameters<Promise<unknown>["then"]>) => run().then(...args) };
          },
        }),
      };
      return callback(tx);
    },
  },
}));

const { createPendingOrder } = await import("./pending-order");

describe("createPendingOrder — transactional insert", () => {
  beforeEach(() => {
    failOrderItemsInsert = false;
  });

  it("succeeds and returns the order when both inserts go through", async () => {
    const result = await createPendingOrder("buyer@example.test");
    expect(result.ok).toBe(true);
  });

  it("propagates a failure from the line-item insert instead of returning a partial success", async () => {
    failOrderItemsInsert = true;
    await expect(createPendingOrder("buyer@example.test")).rejects.toThrow(
      "simulated line-item insert failure"
    );
  });
});
