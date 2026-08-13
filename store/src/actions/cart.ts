"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, variants } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { assertOwnsCartItem, getOrCreateCartId } from "@/lib/cart";

function refreshCart() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

/** Unexpected failures are logged server-side and reported generically. */
function unexpected(scope: string, err: unknown, message: string): ActionResult {
  console.error(`[cart] ${scope} failed:`, err);
  return { ok: false, error: message };
}

const addToCartSchema = z.object({
  variantId: z.uuid(),
  qty: z.number().int().min(1).max(20),
});

export async function addToCart(input: unknown): Promise<ActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { variantId, qty } = parsed.data;

  try {
    const variant = await db.query.variants.findFirst({
      where: eq(variants.id, variantId),
    });
    if (!variant) {
      return { ok: false, error: "This product is no longer available." };
    }
    if (variant.stock <= 0) {
      return { ok: false, error: "This item is out of stock." };
    }

    const cartId = await getOrCreateCartId();

    const existing = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.variantId, variantId)
      ),
    });

    const requestedQty = (existing?.qty ?? 0) + qty;
    const finalQty = Math.min(requestedQty, variant.stock);

    if (existing) {
      await db
        .update(cartItems)
        .set({ qty: finalQty })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId, variantId, qty: finalQty });
    }

    refreshCart();

    if (finalQty < requestedQty) {
      return {
        ok: true,
        notice: `Only ${variant.stock} in stock — your cart now has ${finalQty}.`,
      };
    }
    return { ok: true };
  } catch (err) {
    return unexpected("addToCart", err, "Couldn't add this to your cart.");
  }
}

const updateCartItemSchema = z.object({
  itemId: z.uuid(),
  qty: z.number().int().min(0).max(20),
});

export async function updateCartItem(input: unknown): Promise<ActionResult> {
  const parsed = updateCartItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { itemId, qty } = parsed.data;

  try {
    const item = await assertOwnsCartItem(itemId);
    if (!item) {
      return { ok: false, error: "That item is no longer in your cart." };
    }

    if (qty === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
      refreshCart();
      return { ok: true };
    }

    const variant = await db.query.variants.findFirst({
      where: eq(variants.id, item.variantId),
    });
    if (!variant) {
      return { ok: false, error: "This product is no longer available." };
    }
    if (variant.stock <= 0) {
      return { ok: false, error: "This item just went out of stock." };
    }

    const finalQty = Math.min(qty, variant.stock);
    await db
      .update(cartItems)
      .set({ qty: finalQty })
      .where(eq(cartItems.id, itemId));

    refreshCart();

    if (finalQty < qty) {
      return { ok: true, notice: `Only ${variant.stock} in stock.` };
    }
    return { ok: true };
  } catch (err) {
    return unexpected("updateCartItem", err, "Couldn't update that quantity.");
  }
}

const removeCartItemSchema = z.object({ itemId: z.uuid() });

export async function removeCartItem(input: unknown): Promise<ActionResult> {
  const parsed = removeCartItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { itemId } = parsed.data;

  try {
    const item = await assertOwnsCartItem(itemId);
    if (!item) {
      // Already gone — the user's intent is satisfied either way.
      return { ok: true };
    }

    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    refreshCart();
    return { ok: true };
  } catch (err) {
    return unexpected("removeCartItem", err, "Couldn't remove this item.");
  }
}
