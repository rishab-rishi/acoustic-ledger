import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { VariantEditor } from "@/components/admin/variant-editor";
import { getAdminProduct } from "@/db/admin-queries";
import { getCategories } from "@/db/queries";

export const metadata: Metadata = { title: "Edit product" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/admin/products"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        All products
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">{product.name}</h1>
        {product.active ? (
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
          >
            View in store
            <ExternalLink className="size-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">
            Hidden from the store
          </span>
        )}
      </div>

      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          basePriceCents: product.basePriceCents,
          images: product.images,
          featured: product.featured,
          active: product.active,
        }}
      />

      <div className="mt-10">
        <VariantEditor
          productId={product.id}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            priceCents: v.priceCents,
            stock: v.stock,
          }))}
        />
      </div>
    </div>
  );
}
