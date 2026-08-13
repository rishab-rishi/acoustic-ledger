"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, variants } from "@/db/schema";
import { assertOwnsCartItem, getOrCreateCartId } from "@/lib/cart";

function refreshCart() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
});

export async function addToCart(input: z.infer<typeof addToCartSchema>) {
  const { variantId, qty } = addToCartSchema.parse(input);

  const variant = await db.query.variants.findFirst({
    where: eq(variants.id, variantId),
  });
  if (!variant || variant.stock <= 0) {
    throw new Error("This item is out of stock.");
  }

  const cartId = await getOrCreateCartId();

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
  });

  if (existing) {
    const newQty = Math.min(existing.qty + qty, variant.stock);
    await db
      .update(cartItems)
      .set({ qty: newQty })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      variantId,
      qty: Math.min(qty, variant.stock),
    });
  }

  refreshCart();
}

const updateCartItemSchema = z.object({
  itemId: z.string().uuid(),
  qty: z.number().int().min(0).max(20),
});

export async function updateCartItem(input: z.infer<typeof updateCartItemSchema>) {
  const { itemId, qty } = updateCartItemSchema.parse(input);

  const item = await assertOwnsCartItem(itemId);
  if (!item) return;

  if (qty === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    refreshCart();
    return;
  }

  const variant = await db.query.variants.findFirst({
    where: eq(variants.id, item.variantId),
  });
  const clampedQty = variant ? Math.min(qty, Math.max(variant.stock, 1)) : qty;

  await db
    .update(cartItems)
    .set({ qty: clampedQty })
    .where(eq(cartItems.id, itemId));

  refreshCart();
}

const removeCartItemSchema = z.object({ itemId: z.string().uuid() });

export async function removeCartItem(input: z.infer<typeof removeCartItemSchema>) {
  const { itemId } = removeCartItemSchema.parse(input);

  const item = await assertOwnsCartItem(itemId);
  if (!item) return;

  await db.delete(cartItems).where(eq(cartItems.id, itemId));
  refreshCart();
}

