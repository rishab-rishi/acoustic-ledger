"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { PRODUCTS_CACHE_TAG } from "@/db/queries";
import { orderItems, orders, variants } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { adminGuard } from "@/lib/admin";

const orderIdSchema = z.object({ orderId: z.uuid() });

function refresh(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/orders");
}

/**
 * paid → fulfilled.
 *
 * Guarded on the current status in the UPDATE itself rather than read-then-
 * write, so two admins clicking at once can't both "win" — the same reasoning
 * as settleOrder(). Stock already moved at settlement; fulfilment doesn't
 * touch it.
 */
export async function fulfilOrder(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { orderId } = parsed.data;

  try {
    const claimed = await db
      .update(orders)
      .set({ status: "fulfilled" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
      .returning({ id: orders.id });

    if (claimed.length === 0) {
      return {
        ok: false,
        error: "Only paid orders can be fulfilled. Reload to see its status.",
      };
    }

    refresh(orderId);
    return { ok: true, notice: "Order marked fulfilled." };
  } catch (err) {
    console.error("[admin] fulfilOrder failed:", err);
    return { ok: false, error: "Couldn't update that order." };
  }
}

/**
 * pending | paid → cancelled.
 *
 * Stock is only returned when cancelling a *paid* order, because only
 * settlement decremented it — a pending order never did. Getting this wrong
 * in either direction silently corrupts inventory, so the restock is bound to
 * the same transaction that claims the status.
 */
export async function cancelOrder(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { orderId } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
        columns: { status: true },
      });
      if (!existing) return { kind: "missing" as const };
      if (existing.status === "fulfilled" || existing.status === "cancelled") {
        return { kind: "terminal" as const, status: existing.status };
      }

      const wasPaid = existing.status === "paid";

      const claimed = await tx
        .update(orders)
        .set({ status: "cancelled" })
        .where(and(eq(orders.id, orderId), eq(orders.status, existing.status)))
        .returning({ id: orders.id });

      // Someone else moved it between the read and the update.
      if (claimed.length === 0) return { kind: "raced" as const };

      if (wasPaid) {
        const lines = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId),
        });
        for (const line of lines) {
          if (!line.variantId) continue;
          await tx
            .update(variants)
            .set({ stock: sql`${variants.stock} + ${line.qty}` })
            .where(eq(variants.id, line.variantId));
        }
      }

      return { kind: "cancelled" as const, restocked: wasPaid };
    });

    switch (result.kind) {
      case "missing":
        return { ok: false, error: "That order no longer exists." };
      case "terminal":
        return {
          ok: false,
          error: `A ${result.status} order can't be cancelled.`,
        };
      case "raced":
        return {
          ok: false,
          error: "That order changed while you were working. Reload and retry.",
        };
      default:
        refresh(orderId);
        // Stock moved, so the storefront's availability is now stale.
        if (result.restocked) {
          revalidatePath("/products", "layout");
          // {expire: 0}: restocked availability must not show stale-sold-out.
          revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
        }
        return {
          ok: true,
          notice: result.restocked
            ? "Order cancelled and stock returned."
            : "Order cancelled.",
        };
    }
  } catch (err) {
    console.error("[admin] cancelOrder failed:", err);
    return { ok: false, error: "Couldn't cancel that order." };
  }
}
