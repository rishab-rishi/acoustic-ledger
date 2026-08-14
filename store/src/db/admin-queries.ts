import { and, asc, count, desc, eq, ilike, inArray, lte, or, sql, sum } from "drizzle-orm";
import { db } from "./index";
import { orderItems, orders, products, variants } from "./schema";

/** Statuses where the customer actually paid — what "revenue" counts. */
export const EARNING_STATUSES = ["paid", "fulfilled"] as const;

export const LOW_STOCK_THRESHOLD = 5;

export async function getDashboardStats() {
  const [revenueRow] = await db
    .select({
      revenueCents: sum(orders.totalCents),
      orderCount: count(orders.id),
    })
    .from(orders)
    .where(inArray(orders.status, [...EARNING_STATUSES]));

  const byStatus = await db
    .select({ status: orders.status, n: count(orders.id) })
    .from(orders)
    .groupBy(orders.status);

  const [lowStockRow] = await db
    .select({ n: count(variants.id) })
    .from(variants)
    .where(lte(variants.stock, LOW_STOCK_THRESHOLD));

  const [productRow] = await db
    .select({ n: count(products.id) })
    .from(products)
    .where(eq(products.active, true));

  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));

  return {
    // sum() returns a numeric string (or null on no rows) — coerce once here
    // so callers keep working in integer cents.
    revenueCents: Number(revenueRow?.revenueCents ?? 0),
    paidOrderCount: revenueRow?.orderCount ?? 0,
    awaitingFulfilment: counts.paid ?? 0,
    pendingCount: counts.pending ?? 0,
    fulfilledCount: counts.fulfilled ?? 0,
    cancelledCount: counts.cancelled ?? 0,
    lowStockCount: lowStockRow?.n ?? 0,
    activeProductCount: productRow?.n ?? 0,
  };
}

export function getRecentOrders(limit = 8) {
  return db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    limit,
    with: { items: { columns: { id: true, qty: true } } },
  });
}

export function getLowStockVariants(limit = 8) {
  return db
    .select({
      id: variants.id,
      name: variants.name,
      sku: variants.sku,
      stock: variants.stock,
      productId: products.id,
      productName: products.name,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(lte(variants.stock, LOW_STOCK_THRESHOLD))
    .orderBy(asc(variants.stock), asc(products.name))
    .limit(limit);
}

export type OrderStatus = (typeof orders.status.enumValues)[number];

export function getAdminOrders(status?: OrderStatus) {
  return db.query.orders.findMany({
    where: status ? eq(orders.status, status) : undefined,
    orderBy: desc(orders.createdAt),
    limit: 100,
    with: { items: { columns: { id: true, qty: true } } },
  });
}

export function getAdminOrder(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: { orderBy: asc(orderItems.productName) },
      user: { columns: { id: true, name: true, email: true } },
    },
  });
}

export async function getAdminProducts(params: {
  q?: string;
  active?: "active" | "inactive";
}) {
  const { q, active } = params;

  const filters = [
    q
      ? or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`))
      : undefined,
    active === "active"
      ? eq(products.active, true)
      : active === "inactive"
        ? eq(products.active, false)
        : undefined,
  ].filter(Boolean);

  return db.query.products.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: asc(products.name),
    with: {
      category: true,
      variants: { orderBy: asc(variants.priceCents) },
    },
  });
}

export function getAdminProduct(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: true,
      variants: { orderBy: asc(variants.priceCents) },
    },
  });
}

/**
 * Variants that appear on an order can't be hard-deleted without erasing part
 * of the audit trail, so the UI offers deactivation instead. Checked per
 * variant id in one query rather than N.
 */
export async function variantIdsWithOrders(
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ variantId: orderItems.variantId })
    .from(orderItems)
    .where(inArray(orderItems.variantId, ids));
  return new Set(rows.map((r) => r.variantId).filter(Boolean) as string[]);
}

/** Units sold per product, for the dashboard's "best sellers". */
export function getTopProducts(limit = 5) {
  return db
    .select({
      productName: orderItems.productName,
      units: sql<number>`sum(${orderItems.qty})::int`,
      revenueCents: sql<number>`sum(${orderItems.qty} * ${orderItems.unitPriceCents})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(inArray(orders.status, [...EARNING_STATUSES]))
    .groupBy(orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.qty})`))
    .limit(limit);
}
