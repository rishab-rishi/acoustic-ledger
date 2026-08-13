import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts } from "@/db/schema";

const CART_COOKIE = "cart_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Read-only: safe to call from Server Components. Never creates a cart. */
export async function getCartId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return null;
  const cart = await db.query.carts.findFirst({
    where: eq(carts.sessionToken, token),
  });
  return cart?.id ?? null;
}

/** Mutates cookies — only call from Server Actions / Route Handlers. */
export async function getOrCreateCartId(): Promise<string> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  if (token) {
    const cart = await db.query.carts.findFirst({
      where: eq(carts.sessionToken, token),
    });
    if (cart) return cart.id;
  }

  const newToken = crypto.randomUUID();
  const [cart] = await db
    .insert(carts)
    .values({ sessionToken: newToken })
    .returning();

  store.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  return cart.id;
}

export async function getCart() {
  const cartId = await getCartId();
  if (!cartId) return null;
  return db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: { with: { variant: { with: { product: true } } } },
    },
  });
}

export async function getCartItemCount() {
  const cart = await getCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.qty, 0);
}

/** Ownership check so one guest can't mutate another guest's cart items. */
export async function assertOwnsCartItem(itemId: string) {
  const cartId = await getCartId();
  if (!cartId) return null;
  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
  });
  return item ?? null;
}
