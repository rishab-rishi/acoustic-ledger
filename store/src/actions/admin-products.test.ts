import { describe, expect, it, vi } from "vitest";
import { slugify } from "@/lib/format";

/**
 * slugify() returns "" for input that has no lowercase-letter-or-digit
 * characters at all (e.g. "!!!") — pinned as its own documented behavior in
 * format.test.ts, not a bug. The actual risk is downstream: submitting that
 * empty string as a product's slug would otherwise hit the unique
 * constraint on products.slug as a confusing database error instead of a
 * field error the admin can act on. This proves createProduct rejects it
 * before ever reaching the database.
 */
const dbTransaction = vi.fn();
vi.mock("@/auth", () => ({ auth: async () => ({ user: { role: "admin" } }) }));
vi.mock("@/db", () => ({
  db: { transaction: (...args: unknown[]) => dbTransaction(...args) },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { createProduct } = await import("./admin-products");

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Mystery Product",
    slug: slugify("!!!"), // ""
    description: "A product with a name that has no sluggable characters.",
    categoryId: "00000000-0000-0000-0000-000000000000",
    basePriceCents: 1000,
    images: [],
    featured: false,
    active: true,
    variant: { name: "Standard", sku: "MYST-STD", priceCents: 1000, stock: 10 },
    ...overrides,
  };
}

describe("createProduct — empty slug", () => {
  it("rejects an empty slug with a field error instead of reaching the database", async () => {
    const result = await createProduct(validInput());

    expect(result).toEqual({ ok: false, error: "Slug is required." });
    expect(dbTransaction).not.toHaveBeenCalled();
  });
});
