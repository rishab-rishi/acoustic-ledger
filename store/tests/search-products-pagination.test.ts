import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, searchProducts } from "@/db/queries";
import { categories, products } from "@/db/schema";
import { testId } from "./fixtures";

/**
 * searchProducts() has no LIMIT at all before this task — at 38 seeded
 * products that's invisible, at scale it's a full table scan and a
 * multi-megabyte response per request. The clamp is the security-relevant
 * half: a hand-typed oversized limit must be capped server-side, not honored.
 */
async function makeProducts(count: number, priceCents = 10_000) {
  const slug = testId();
  const [category] = await db
    .insert(categories)
    .values({ name: `Pager ${slug}`, slug: `pager-${slug}` })
    .returning();

  await db.insert(products).values(
    Array.from({ length: count }, (_, i) => ({
      // Zero-padded so name ordering matches insertion/creation order.
      name: `Pager Item ${slug} ${String(i).padStart(3, "0")}`,
      slug: `pager-item-${slug}-${i}`,
      description: "fixture",
      categoryId: category.id,
      basePriceCents: priceCents,
    }))
  );

  return category;
}

describe("searchProducts — pagination", () => {
  it("defaults to DEFAULT_PAGE_SIZE rows and reports the true total", async () => {
    const category = await makeProducts(DEFAULT_PAGE_SIZE + 5);

    const result = await searchProducts({ category: category.slug });

    expect(result.products).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(result.total).toBe(DEFAULT_PAGE_SIZE + 5);
  });

  it("clamps an oversized limit to MAX_PAGE_SIZE instead of honoring it", async () => {
    const category = await makeProducts(MAX_PAGE_SIZE + 10);

    const result = await searchProducts({ category: category.slug, limit: 100_000 });

    expect(result.products).toHaveLength(MAX_PAGE_SIZE);
    expect(result.total).toBe(MAX_PAGE_SIZE + 10);
  });

  it("offset moves to the next slice without repeating rows", async () => {
    const category = await makeProducts(25);

    const pageOne = await searchProducts({ category: category.slug, limit: 10, offset: 0, sort: "name" });
    const pageTwo = await searchProducts({ category: category.slug, limit: 10, offset: 10, sort: "name" });

    expect(pageOne.products).toHaveLength(10);
    expect(pageTwo.products).toHaveLength(10);
    const idsOne = new Set(pageOne.products.map((p) => p.id));
    const idsTwo = new Set(pageTwo.products.map((p) => p.id));
    expect([...idsOne].some((id) => idsTwo.has(id))).toBe(false);
  });

  it("clamps a negative or non-finite offset to 0 rather than erroring", async () => {
    const category = await makeProducts(5);

    const result = await searchProducts({ category: category.slug, offset: -50 });

    expect(result.products).toHaveLength(5);
  });

  it("keeps the count query scoped to the same filters as the row query", async () => {
    const categoryA = await makeProducts(3);
    await makeProducts(7); // an unrelated category — must not leak into the count

    const result = await searchProducts({ category: categoryA.slug, limit: 1 });

    expect(result.total).toBe(3);
    expect(result.products).toHaveLength(1);
  });
});
