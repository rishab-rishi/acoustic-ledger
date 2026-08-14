import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories } from "@/db/queries";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/admin/products"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        All products
      </Link>

      <h1 className="mb-8 text-2xl font-medium tracking-tight">New product</h1>

      <ProductForm categories={categories} />
    </div>
  );
}
