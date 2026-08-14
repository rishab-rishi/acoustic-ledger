/**
 * Diagnostic: ask PayPal what state our pending orders are actually in.
 * Run: npx tsx scripts/inspect-paypal-orders.ts
 */
import { desc, isNotNull } from "drizzle-orm";
import { db } from "../src/db";
import { orders } from "../src/db/schema";
import { paypalFetch } from "../src/lib/paypal";

type OrderDetail = {
  id: string;
  status: string;
  intent?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code: string; value: string };
    payee?: { email_address?: string; merchant_id?: string };
  }>;
  payer?: { email_address?: string; payer_id?: string };
  create_time?: string;
};

async function main() {
  const rows = await db.query.orders.findMany({
    where: isNotNull(orders.paypalOrderId),
    orderBy: desc(orders.createdAt),
    limit: 5,
  });

  for (const row of rows) {
    if (!row.paypalOrderId) continue;
    process.stdout.write(`\n${row.paypalOrderId}  (db: ${row.status})\n`);
    try {
      const d = await paypalFetch<OrderDetail>(
        `/v2/checkout/orders/${row.paypalOrderId}`
      );
      const unit = d.purchase_units?.[0];
      console.log(`  paypal status : ${d.status}`);
      console.log(`  currency/amt  : ${unit?.amount?.currency_code} ${unit?.amount?.value}`);
      console.log(`  payee         : ${unit?.payee?.email_address ?? "-"} (${unit?.payee?.merchant_id ?? "-"})`);
      console.log(`  payer         : ${d.payer?.email_address ?? "(none — never approved)"}`);
    } catch (e) {
      console.log(`  lookup failed: ${(e as Error).message.slice(0, 300)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
