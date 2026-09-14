import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sign-in folds the guest cookie cart into the user's cart. Getting the clamp
 * wrong here puts more units in a cart than exist in stock, which then fails at
 * checkout instead of at the merge.
 *
 * `next/headers` only works inside a request, so the cookie jar is faked.
 */
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

vi.mock("@/auth", () => ({ auth: async () => null }));

const { db } = await import("@/db");
const { cartItems, carts } = await import("@/db/schema");
const { mergeGuestCartIntoUserCart } = await import("@/lib/cart");
const { makeUser, makeVariant } = await import("./fixtures");

async function guestCartWith(items: { variantId: string; qty: number }[]) {
  const token = crypto.randomUUID();
  const [cart] = await db.insert(carts).values({ sessionToken: token }).returning();
  if (items.length > 0) {
    await db
      .insert(cartItems)
      .values(items.map((i) => ({ cartId: cart.id, ...i })));
  }
  jar.set("cart_session", token);
  return cart;
}

async function itemsFor(userId: string) {
  const cart = await db.query.carts.findFirst({
    where: eq(carts.userId, userId),
    with: { items: true },
  });
  return cart?.items ?? [];
}

describe("mergeGuestCartIntoUserCart", () => {
  beforeEach(() => jar.clear());

  it("moves guest items onto a user who had no cart", async () => {
    const user = await makeUser();
    const { variant } = await makeVariant(10);
    await guestCartWith([{ variantId: variant.id, qty: 2 }]);

    await mergeGuestCartIntoUserCart(user.id);

    const items = await itemsFor(user.id);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });

  it("sums quantities for a variant present in both carts", async () => {
    const user = await makeUser();
    const { variant } = await makeVariant(10);

    const [userCart] = await db.insert(carts).values({ userId: user.id }).returning();
    await db.insert(cartItems).values({
      cartId: userCart.id,
      variantId: variant.id,
      qty: 3,
    });

    await guestCartWith([{ variantId: variant.id, qty: 2 }]);
    await mergeGuestCartIntoUserCart(user.id);

    const items = await itemsFor(user.id);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(5);
  });

  it("clamps the merged quantity to available stock", async () => {
    const user = await makeUser();
    const { variant } = await makeVariant(4);

    const [userCart] = await db.insert(carts).values({ userId: user.id }).returning();
    await db.insert(cartItems).values({
      cartId: userCart.id,
      variantId: variant.id,
      qty: 3,
    });

    await guestCartWith([{ variantId: variant.id, qty: 3 }]);
    await mergeGuestCartIntoUserCart(user.id);

    const items = await itemsFor(user.id);
    expect(items[0].qty).toBe(4);
  });

  it("drops items that sold out while the guest was shopping", async () => {
    const user = await makeUser();
    const soldOut = await makeVariant(0);
    const available = await makeVariant(5);

    await guestCartWith([
      { variantId: soldOut.variant.id, qty: 1 },
      { variantId: available.variant.id, qty: 1 },
    ]);

    await mergeGuestCartIntoUserCart(user.id);

    const items = await itemsFor(user.id);
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(available.variant.id);
  });

  it("deletes the guest cart and clears the cookie", async () => {
    const user = await makeUser();
    const { variant } = await makeVariant(5);
    const guest = await guestCartWith([{ variantId: variant.id, qty: 1 }]);

    await mergeGuestCartIntoUserCart(user.id);

    const stale = await db.query.carts.findFirst({ where: eq(carts.id, guest.id) });
    expect(stale).toBeUndefined();
    expect(jar.has("cart_session")).toBe(false);
  });

  it("cleans up an empty guest cart without creating a user cart", async () => {
    const user = await makeUser();
    const guest = await guestCartWith([]);

    await mergeGuestCartIntoUserCart(user.id);

    expect(await db.query.carts.findFirst({ where: eq(carts.id, guest.id) })).toBeUndefined();
    expect(await itemsFor(user.id)).toHaveLength(0);
    expect(jar.has("cart_session")).toBe(false);
  });

  it("is a no-op with no guest cookie", async () => {
    const user = await makeUser();
    await expect(mergeGuestCartIntoUserCart(user.id)).resolves.toBeUndefined();
    expect(await itemsFor(user.id)).toHaveLength(0);
  });

  it("clears a cookie pointing at a cart that no longer exists", async () => {
    const user = await makeUser();
    jar.set("cart_session", crypto.randomUUID());

    await mergeGuestCartIntoUserCart(user.id);

    expect(jar.has("cart_session")).toBe(false);
  });
});
