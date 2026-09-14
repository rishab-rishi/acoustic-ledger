import { and, asc, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/db";
import { cartItems, carts, variants } from "@/db/schema";

const CART_COOKIE = "cart_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function guestToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

/**
 * Read-only: safe from Server Components. Never creates a cart or a cookie.
 *
 * A signed-in user's cart always wins over the guest cookie, so a stale
 * cookie left over from before sign-in can't resurrect an old guest cart.
 */
export async function getCartId(): Promise<string | null> {
  const userId = await currentUserId();

  if (userId) {
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });
    return cart?.id ?? null;
  }

  const token = await guestToken();
  if (!token) return null;

  const cart = await db.query.carts.findFirst({
    where: eq(carts.sessionToken, token),
  });
  return cart?.id ?? null;
}

/** Mutates cookies — only call from Server Actions / Route Handlers. */
export async function getOrCreateCartId(): Promise<string> {
  const userId = await currentUserId();

  if (userId) {
    const existing = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });
    if (existing) return existing.id;

    const [created] = await db.insert(carts).values({ userId }).returning();
    return created.id;
  }

  const token = await guestToken();
  if (token) {
    const existing = await db.query.carts.findFirst({
      where: eq(carts.sessionToken, token),
    });
    if (existing) return existing.id;
  }

  const newToken = crypto.randomUUID();
  const [created] = await db
    .insert(carts)
    .values({ sessionToken: newToken })
    .returning();

  (await cookies()).set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  return created.id;
}

export async function getCart() {
  const cartId = await getCartId();
  if (!cartId) return null;
  return db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      // No orderBy left the row order to whatever Postgres happened to
      // return, which could reshuffle between renders while someone was
      // editing quantities.
      items: {
        orderBy: asc(cartItems.createdAt),
        with: { variant: { with: { product: true } } },
      },
    },
  });
}

/** Header badge — a sum, not a full product join. */
export async function getCartItemCount(): Promise<number> {
  const cartId = await getCartId();
  if (!cartId) return 0;

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${cartItems.qty}), 0)::int` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));

  return row?.total ?? 0;
}

/** Ownership check so nobody can mutate a cart item that isn't theirs. */
export async function assertOwnsCartItem(itemId: string) {
  const cartId = await getCartId();
  if (!cartId) return null;

  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
  });
  return item ?? null;
}

/**
 * Fold the guest cookie cart into the user's cart on sign-in.
 *
 * Quantities are summed for variants present in both carts, clamped to
 * current stock, and the guest cart is deleted. Runs in one transaction so
 * a mid-merge failure can't leave items split across two carts.
 */
export async function mergeGuestCartIntoUserCart(userId: string) {
  const token = await guestToken();
  if (!token) return;

  const guestCart = await db.query.carts.findFirst({
    where: eq(carts.sessionToken, token),
    with: { items: true },
  });

  // Clear the cookie regardless — once signed in, the user cart is the
  // source of truth and a lingering guest token only causes confusion.
  const clearCookie = async () => {
    (await cookies()).delete(CART_COOKIE);
  };

  if (!guestCart) {
    await clearCookie();
    return;
  }

  if (guestCart.items.length === 0) {
    await db.delete(carts).where(eq(carts.id, guestCart.id));
    await clearCookie();
    return;
  }

  await db.transaction(async (tx) => {
    let userCart = await tx.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });
    if (!userCart) {
      [userCart] = await tx.insert(carts).values({ userId }).returning();
    }

    for (const item of guestCart.items) {
      const variant = await tx.query.variants.findFirst({
        where: eq(variants.id, item.variantId),
      });
      // Sold out while the guest was shopping — don't carry it over.
      if (!variant || variant.stock <= 0) continue;

      const existing = await tx.query.cartItems.findFirst({
        where: and(
          eq(cartItems.cartId, userCart.id),
          eq(cartItems.variantId, item.variantId)
        ),
      });

      const merged = Math.min(
        (existing?.qty ?? 0) + item.qty,
        variant.stock
      );

      if (existing) {
        await tx
          .update(cartItems)
          .set({ qty: merged })
          .where(eq(cartItems.id, existing.id));
      } else {
        await tx.insert(cartItems).values({
          cartId: userCart.id,
          variantId: item.variantId,
          qty: merged,
        });
      }
    }

    // Cascades to the guest cart's items.
    await tx.delete(carts).where(eq(carts.id, guestCart.id));
  });

  await clearCookie();
}
