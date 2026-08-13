import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { categories, products, variants } from "./schema";

export function getCategories() {
  return db.query.categories.findMany({ orderBy: asc(categories.name) });
}

export function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

export function getFeaturedProducts(limit = 6) {
  return db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.featured, true)),
    orderBy: desc(products.createdAt),
    limit,
    with: { category: true },
  });
}

export async function getProducts(categorySlug?: string) {
  let categoryId: string | undefined;
  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (!category) return [];
    categoryId = category.id;
  }

  return db.query.products.findMany({
    where: categoryId
      ? and(eq(products.active, true), eq(products.categoryId, categoryId))
      : eq(products.active, true),
    orderBy: asc(products.name),
    with: { category: true },
  });
}

export function getProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.active, true)),
    with: {
      category: true,
      variants: { orderBy: asc(variants.priceCents) },
    },
  });
}
