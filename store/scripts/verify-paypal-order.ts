/**
 * Sends the real order payload to the PayPal sandbox and captures nothing.
 *
 * This exercises `buildPaypalOrderPayload` — the same function the checkout
 * action uses — against live sandbox validation, so payload mistakes surface
 * here instead of on a button click during a demo.
 *
 * Run: npx tsx scripts/verify-paypal-order.ts
 */
import { db } from "../src/db";
import {
  buildPaypalOrderPayload,
  paypalAmountToCents,
  paypalFetch,
  shippingForSubtotal,
} from "../src/lib/paypal";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `  got=${actual} expected=${expected}`)
  );
}

type CreatedOrder = {
  id: string;
  status: string;
  links?: Array<{ rel: string; href: string }>;
};

async function createFrom(items: Awaited<ReturnType<typeof pickVariants>>) {
  const subtotalCents = items.reduce(
    (s, v) => s + v.priceCents * v.qty,
    0
  );
  const shippingCents = shippingForSubtotal(subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const internalOrderId = crypto.randomUUID();

  const payload = buildPaypalOrderPayload({
    internalOrderId,
    items: items.map((v) => ({
      productName: v.productName,
      variantName: v.name,
      qty: v.qty,
      unitPriceCents: v.priceCents,
    })),
    subtotalCents,
    shippingCents,
    totalCents,
  });

  const created = await paypalFetch<CreatedOrder>("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": `verify-${internalOrderId}` },
    body: JSON.stringify(payload),
  });

  return { created, internalOrderId, subtotalCents, shippingCents, totalCents };
}

async function pickVariants(limit: number, qty: number) {
  const rows = await db.query.variants.findMany({
    limit,
    with: { product: true },
  });
  return rows.map((r) => ({
    name: r.name,
    priceCents: r.priceCents,
    productName: r.product.name,
    qty,
  }));
}

async function main() {
  console.log("\n1. multi-item order, subtotal over the free-shipping threshold");
  {
    const items = await pickVariants(3, 2);
    const { created, internalOrderId, totalCents, shippingCents } =
      await createFrom(items);
    check("PayPal accepted the payload", created.status, "CREATED");
    check("returned an order id", Boolean(created.id), true);
    check("has an approve link", Boolean(created.links?.some((l) => l.rel === "approve")), true);
    console.log(
      `        order ${created.id} · total ${totalCents}c · shipping ${shippingCents}c · custom_id ${internalOrderId.slice(0, 8)}…`
    );

    // Read it back and confirm PayPal stored exactly what we sent.
    const fetched = await paypalFetch<{
      purchase_units: Array<{
        custom_id?: string;
        amount: { value: string };
      }>;
    }>(`/v2/checkout/orders/${created.id}`);
    check("custom_id round-trips", fetched.purchase_units[0].custom_id, internalOrderId);
    check(
      "amount round-trips to the exact cent",
      paypalAmountToCents(fetched.purchase_units[0].amount.value),
      totalCents
    );
  }

  console.log("\n2. small order that should attract flat shipping");
  {
    const cheap = await db.query.variants.findMany({
      limit: 1,
      with: { product: true },
    });
    const items = [
      {
        name: cheap[0].name,
        priceCents: 1900,
        productName: cheap[0].product.name,
        qty: 1,
      },
    ];
    const { created, shippingCents, totalCents } = await createFrom(items);
    check("shipping charged below threshold", shippingCents, 900);
    check("total = subtotal + shipping", totalCents, 2800);
    check("PayPal accepted it", created.status, "CREATED");
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("THREW:", e);
  process.exit(1);
});
