"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { PRODUCTS_CACHE_TAG } from "@/db/queries";
import { cartItems, products, variants } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { adminGuard } from "@/lib/admin";

/** Create returns the new id so the form can navigate straight to the editor. */
export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

function refresh(productSlug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  if (productSlug) revalidatePath(`/products/${productSlug}`);
  // revalidatePath alone only busts the route render cache — the catalog's
  // own data reads (getCachedCategories, searchProductsCached, etc.) go
  // through Next's separate Data Cache, which only this tag clears.
  // {expire: 0}, not the recommended "max" stale-while-revalidate profile:
  // an admin who just edited a product expects to see it land immediately,
  // not serve one more stale response first.
  revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
}

/**
 * Postgres unique violations are the one "expected" database error here —
 * slugs and SKUs are user-supplied and collide in normal use. Anything else is
 * a real fault and stays generic.
 *
 * Drizzle wraps driver errors, so the pg error carrying `code`/`constraint` is
 * usually a `cause` hop or two down rather than the thrown object itself.
 */
function uniqueViolation(err: unknown): string | null {
  let current: unknown = err;

  for (let depth = 0; current && depth < 5; depth++) {
    const e = current as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };

    if (e.code === "23505") {
      if (e.constraint?.includes("sku")) return "That SKU is already in use.";
      if (e.constraint?.includes("slug")) return "That slug is already in use.";
      return "That value must be unique.";
    }

    current = e.cause;
  }

  return null;
}

const priceCents = z
  .number({ error: "Enter a price like 249.00." })
  .int()
  .min(0, "Price can't be negative.")
  .max(100_000_000);

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
  description: z.string().trim().min(1, "Description is required.").max(4000),
  categoryId: z.uuid("Pick a category."),
  basePriceCents: priceCents,
  images: z.array(z.string().trim().min(1)).max(8),
  featured: z.boolean(),
  active: z.boolean(),
});

const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required.").max(80),
  sku: z
    .string()
    .trim()
    .min(2, "SKU is required.")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU can use letters, numbers, dots, dashes."),
  priceCents,
  stock: z.number().int().min(0, "Stock can't be negative.").max(1_000_000),
});

// --- Products ---------------------------------------------------------

export async function createProduct(
  input: unknown
): Promise<CreateProductResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = productSchema
    .extend({ variant: variantSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { variant, ...product } = parsed.data;

  try {
    // A product with no variants can't be priced or added to a cart, so the
    // first one is created in the same transaction rather than left optional.
    const productId = await db.transaction(async (tx) => {
      const [row] = await tx.insert(products).values(product).returning({
        id: products.id,
      });
      await tx.insert(variants).values({ ...variant, productId: row.id });
      return row.id;
    });

    refresh(product.slug);
    return { ok: true, productId };
  } catch (err) {
    const conflict = uniqueViolation(err);
    if (conflict) return { ok: false, error: conflict };
    console.error("[admin] createProduct failed:", err);
    return { ok: false, error: "Couldn't create that product." };
  }
}

export async function updateProduct(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = productSchema
    .extend({ productId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { productId, ...fields } = parsed.data;

  try {
    const existing = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { slug: true },
    });
    if (!existing) return { ok: false, error: "That product no longer exists." };

    await db.update(products).set(fields).where(eq(products.id, productId));

    refresh(fields.slug);
    // The old URL is now stale too.
    if (existing.slug !== fields.slug) revalidatePath(`/products/${existing.slug}`);
    return { ok: true, notice: "Product saved." };
  } catch (err) {
    const conflict = uniqueViolation(err);
    if (conflict) return { ok: false, error: conflict };
    console.error("[admin] updateProduct failed:", err);
    return { ok: false, error: "Couldn't save that product." };
  }
}

export async function setProductActive(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = z
    .object({ productId: z.uuid(), active: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, active } = parsed.data;

  try {
    const [row] = await db
      .update(products)
      .set({ active })
      .where(eq(products.id, productId))
      .returning({ slug: products.slug });
    if (!row) return { ok: false, error: "That product no longer exists." };

    refresh(row.slug);
    return { ok: true, notice: active ? "Product is live." : "Product hidden." };
  } catch (err) {
    console.error("[admin] setProductActive failed:", err);
    return { ok: false, error: "Couldn't update that product." };
  }
}

/**
 * Hard delete.
 *
 * Order history survives because order_items snapshots names and prices and
 * its variant_id is ON DELETE SET NULL — deleting a product can't rewrite what
 * someone already bought. Cart rows have no such protection and would block
 * the delete, so they're cleared first, inside the same transaction.
 *
 * Deactivating is the softer option and is what the list page nudges toward.
 */
export async function deleteProduct(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = z.object({ productId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId } = parsed.data;

  try {
    const existing = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { slug: true },
      with: { variants: { columns: { id: true } } },
    });
    if (!existing) return { ok: true, notice: "Product already deleted." };

    await db.transaction(async (tx) => {
      for (const variant of existing.variants) {
        await tx.delete(cartItems).where(eq(cartItems.variantId, variant.id));
      }
      await tx.delete(products).where(eq(products.id, productId));
    });

    refresh(existing.slug);
    return { ok: true, notice: "Product deleted." };
  } catch (err) {
    console.error("[admin] deleteProduct failed:", err);
    return { ok: false, error: "Couldn't delete that product." };
  }
}

// --- Variants ---------------------------------------------------------

export async function createVariant(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = variantSchema.extend({ productId: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  try {
    await db.insert(variants).values(parsed.data);
    refresh();
    revalidatePath(`/admin/products/${parsed.data.productId}/edit`);
    return { ok: true, notice: "Variant added." };
  } catch (err) {
    const conflict = uniqueViolation(err);
    if (conflict) return { ok: false, error: conflict };
    console.error("[admin] createVariant failed:", err);
    return { ok: false, error: "Couldn't add that variant." };
  }
}

export async function updateVariant(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = variantSchema.extend({ variantId: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { variantId, ...fields } = parsed.data;

  try {
    const [row] = await db
      .update(variants)
      .set(fields)
      .where(eq(variants.id, variantId))
      .returning({ productId: variants.productId });
    if (!row) return { ok: false, error: "That variant no longer exists." };

    refresh();
    revalidatePath(`/admin/products/${row.productId}/edit`);
    return { ok: true, notice: "Variant saved." };
  } catch (err) {
    const conflict = uniqueViolation(err);
    if (conflict) return { ok: false, error: conflict };
    console.error("[admin] updateVariant failed:", err);
    return { ok: false, error: "Couldn't save that variant." };
  }
}

export async function deleteVariant(input: unknown): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return { ok: false, ...denied };

  const parsed = z.object({ variantId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { variantId } = parsed.data;

  try {
    const variant = await db.query.variants.findFirst({
      where: eq(variants.id, variantId),
      columns: { productId: true },
    });
    if (!variant) return { ok: true, notice: "Variant already deleted." };

    const [{ n }] = await db
      .select({ n: count(variants.id) })
      .from(variants)
      .where(eq(variants.productId, variant.productId));

    // Without a variant the product has no price and no way into a cart.
    if (n <= 1) {
      return {
        ok: false,
        error: "A product needs at least one variant. Delete the product instead.",
      };
    }

    await db.transaction(async (tx) => {
      await tx.delete(cartItems).where(eq(cartItems.variantId, variantId));
      await tx.delete(variants).where(eq(variants.id, variantId));
    });

    refresh();
    revalidatePath(`/admin/products/${variant.productId}/edit`);
    return { ok: true, notice: "Variant deleted." };
  } catch (err) {
    console.error("[admin] deleteVariant failed:", err);
    return { ok: false, error: "Couldn't delete that variant." };
  }
}
