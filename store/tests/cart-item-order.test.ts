import { describe, expect, it, vi } from "vitest";

/**
 * getCart()'s items had no orderBy, so row order was whatever Postgres
 * happened to return — free to reshuffle between renders while someone was
 * editing quantities. This pins that items always come back in the order
 * they were added.
 *
 * `next/headers` only works inside a request, so the cookie jar is faked,
 * same as tests/cart-merge.test.ts.
 */
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

vi.mock("@/auth", () => ({ auth: async () => null }));

const { db } = await import("@/db");
const { cartItems } = await import("@/db/schema");
const { getCart, getOrCreateCartId } = await import("@/lib/cart");
const { makeVariant } = await import("./fixtures");

describe("getCart — item order", () => {
  it("returns items in the order they were added, not insertion-unspecified order", async () => {
    jar.clear();
    const cartId = await getOrCreateCartId();

    const { variant: first } = await makeVariant(10);
    const { variant: second } = await makeVariant(10);
    const { variant: third } = await makeVariant(10);

    // Inserted out of any name/id order, one statement at a time so
    // createdAt strictly increases — added third, then first, then second.
    await db.insert(cartItems).values({ cartId, variantId: third.id, qty: 1 });
    await db.insert(cartItems).values({ cartId, variantId: first.id, qty: 1 });
    await db.insert(cartItems).values({ cartId, variantId: second.id, qty: 1 });

    const cart = await getCart();

    expect(cart?.items.map((i) => i.variantId)).toEqual([third.id, first.id, second.id]);
  });
});
