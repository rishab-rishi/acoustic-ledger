import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  products,
  users,
  variants,
} from "@/db/schema";

const TAG = "vitest";

/** Everything these tests create is prefixed so cleanup can't touch real rows. */
export const testId = () => `${TAG}-${crypto.randomUUID().slice(0, 8)}`;

export async function makeVariant(stock: number, priceCents = 10_000) {
  const slug = testId();

  const [category] = await db
    .insert(categories)
    .values({ name: `Category ${slug}`, slug: `cat-${slug}` })
    .returning();

  const [product] = await db
    .insert(products)
    .values({
      name: `Product ${slug}`,
      slug: `prod-${slug}`,
      description: "fixture",
      categoryId: category.id,
      basePriceCents: priceCents,
    })
    .returning();

  const [variant] = await db
    .insert(variants)
    .values({
      productId: product.id,
      name: "Standard",
      sku: `sku-${slug}`,
      priceCents,
      stock,
    })
    .returning();

  return { category, product, variant };
}

export async function makePendingOrder(params: {
  variantId: string;
  qty: number;
  unitPriceCents: number;
  shippingCents?: number;
}) {
  const { variantId, qty, unitPriceCents, shippingCents = 0 } = params;
  const subtotalCents = qty * unitPriceCents;

  const [order] = await db
    .insert(orders)
    .values({
      email: `${testId()}@example.test`,
      status: "pending",
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    variantId,
    productName: "Product",
    variantName: "Standard",
    unitPriceCents,
    qty,
  });

  return order;
}

export async function stockOf(variantId: string) {
  const row = await db.query.variants.findFirst({
    where: eq(variants.id, variantId),
  });
  return row?.stock ?? null;
}

export async function orderRow(orderId: string) {
  return db.query.orders.findFirst({ where: eq(orders.id, orderId) });
}

export async function makeUser() {
  const [user] = await db
    .insert(users)
    .values({ email: `${testId()}@example.test`, name: "Fixture" })
    .returning();
  return user;
}
