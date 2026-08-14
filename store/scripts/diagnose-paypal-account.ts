/**
 * Diagnostic: what currencies will this sandbox merchant actually accept?
 * Run: npx tsx scripts/diagnose-paypal-account.ts
 */
import "./_env";
import { buildPaypalOrderPayload, paypalFetch } from "../src/lib/paypal";

async function tryCurrency(code: string) {
  const payload = buildPaypalOrderPayload({
    internalOrderId: crypto.randomUUID(),
    items: [
      { productName: "Diagnostic", variantName: "test", qty: 1, unitPriceCents: 1000 },
    ],
    subtotalCents: 1000,
    shippingCents: 0,
    totalCents: 1000,
  });
  // swap the currency everywhere
  const swapped = JSON.parse(JSON.stringify(payload).replaceAll('"USD"', `"${code}"`));

  try {
    const res = await paypalFetch<{ id: string; status: string }>(
      "/v2/checkout/orders",
      { method: "POST", body: JSON.stringify(swapped) }
    );
    console.log(`  ${code.padEnd(4)} accepted  (order ${res.id}, ${res.status})`);
    return true;
  } catch (e) {
    const msg = (e as Error).message;
    const issue = msg.match(/"issue":"([A-Z_]+)"/)?.[1] ?? msg.slice(0, 120);
    console.log(`  ${code.padEnd(4)} REJECTED  ${issue}`);
    return false;
  }
}

async function main() {
  console.log("\nMerchant identity:");
  try {
    const info = await paypalFetch<Record<string, unknown>>(
      "/v1/identity/oauth2/userinfo?schema=paypalv1.1"
    );
    console.log("  ", JSON.stringify(info).slice(0, 400));
  } catch (e) {
    console.log("   userinfo unavailable:", (e as Error).message.slice(0, 160));
  }

  console.log("\nCurrency acceptance at order-creation time:");
  for (const c of ["USD", "INR", "EUR", "GBP"]) {
    await tryCurrency(c);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
