/**
 * Proves the settlement path can't double-decrement stock.
 *
 * Build spec §6 calls this out explicitly: "Stripe retries, and
 * double-decrementing stock is the bug you'll ship otherwise." With PayPal the
 * risk is worse, because capture *and* webhook both settle, so they can race
 * on a first delivery rather than only on a retry.
 *
 * Run: npx tsx scripts/verify-settlement.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { carts, orderItems, orders, variants } from "../src/db/schema";
import { settleOrder } from "../src/lib/settle-order";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}` + (ok ? "" : `  got=${actual} expected=${expected}`));
}

async function main() {
  const variant = await db.query.variants.findFirst();
  if (!variant) throw new Error("no variants — run the seed first");

  const startStock = 50;
  await db.update(variants).set({ stock: startStock }).where(eq(variants.id, variant.id));

  const [cart] = await db
    .insert(carts)
    .values({ sessionToken: `verify-${Date.now()}` })
    .returning();

  const [order] = await db
    .insert(orders)
    .values({
      email: "verify@demo.test",
      status: "pending",
      subtotalCents: variant.priceCents * 3,
      shippingCents: 0,
      totalCents: variant.priceCents * 3,
      paypalOrderId: `VERIFY${Date.now()}`,
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    variantId: variant.id,
    productName: "Verification Product",
    variantName: variant.name,
    unitPriceCents: variant.priceCents,
    qty: 3,
  });

  console.log("\n1. first settle (the capture route's call)");
  const first = await settleOrder({ orderId: order.id, captureId: "CAP-1", cartId: cart.id });
  check("reports settled", first.settled, true);
  let row = await db.query.variants.findFirst({ where: eq(variants.id, variant.id) });
  check("stock decremented once", row?.stock, startStock - 3);
  let o = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
  check("order marked paid", o?.status, "paid");
  check("capture id stored", o?.paypalCaptureId, "CAP-1");
  const cartGone = await db.query.carts.findFirst({ where: eq(carts.id, cart.id) });
  check("cart cleared", cartGone === undefined, true);

  console.log("\n2. duplicate settle (webhook arriving after capture)");
  const second = await settleOrder({ orderId: order.id, captureId: "CAP-2", cartId: null });
  check("reports already-settled", second.settled === false && second.reason === "already-settled", true);
  row = await db.query.variants.findFirst({ where: eq(variants.id, variant.id) });
  check("stock UNCHANGED", row?.stock, startStock - 3);
  o = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
  check("capture id not overwritten", o?.paypalCaptureId, "CAP-1");

  console.log("\n3. concurrent settles (capture and webhook racing)");
  await db.update(variants).set({ stock: startStock }).where(eq(variants.id, variant.id));
  await db.update(orders).set({ status: "pending" }).where(eq(orders.id, order.id));
  const results = await Promise.all([
    settleOrder({ orderId: order.id, captureId: "RACE-A", cartId: null }),
    settleOrder({ orderId: order.id, captureId: "RACE-B", cartId: null }),
    settleOrder({ orderId: order.id, captureId: "RACE-C", cartId: null }),
  ]);
  check("exactly one winner", results.filter((r) => r.settled).length, 1);
  row = await db.query.variants.findFirst({ where: eq(variants.id, variant.id) });
  check("stock decremented exactly once", row?.stock, startStock - 3);

  console.log("\n4. unknown order id");
  const missing = await settleOrder({
    orderId: "00000000-0000-0000-0000-000000000000",
    captureId: "X",
    cartId: null,
  });
  check("reports not-found", missing.settled === false && missing.reason === "not-found", true);

  // cleanup
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));
  await db.update(variants).set({ stock: variant.stock }).where(eq(variants.id, variant.id));

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
