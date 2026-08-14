import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LOW_STOCK_THRESHOLD, getAdminProducts } from "@/db/admin-queries";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const FILTERS = [
  { key: undefined, label: "All", href: "/admin/products" },
  { key: "active", label: "Active", href: "/admin/products?active=active" },
  { key: "inactive", label: "Hidden", href: "/admin/products?active=inactive" },
] as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string }>;
}) {
  const { q, active } = await searchParams;
  const activeFilter =
    active === "active" || active === "inactive" ? active : undefined;

  const rows = await getAdminProducts({ q: q?.trim() || undefined, active: activeFilter });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus className="size-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* A plain GET form — search survives a reload and is linkable. */}
        <form action="/admin/products" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or slug"
            aria-label="Search products"
            className="h-9 w-56 border border-border bg-transparent px-3 text-sm outline-none focus-visible:border-accent"
          />
          {activeFilter ? (
            <input type="hidden" name="active" value={activeFilter} />
          ) : null}
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const href = q
              ? `${f.href}${f.href.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}`
              : f.href;
            return (
              <Link
                key={f.label}
                href={href}
                className={cn(
                  "border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors",
                  activeFilter === f.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="border border-border p-8 text-center text-sm text-muted-foreground">
          {q ? `Nothing matches “${q}”.` : "No products yet."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Variants</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">From</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => {
                const stock = product.variants.reduce((n, v) => n + v.stock, 0);
                const cheapest = product.variants.length
                  ? Math.min(...product.variants.map((v) => v.priceCents))
                  : product.basePriceCents;

                return (
                  <TableRow key={product.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">
                        {product.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category.name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {product.variants.length}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-sm tabular-nums",
                        stock === 0
                          ? "text-destructive"
                          : stock <= LOW_STOCK_THRESHOLD
                            ? "text-accent"
                            : ""
                      )}
                    >
                      {stock}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatCents(cheapest)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={product.active ? "secondary" : "outline"}>
                          {product.active ? "active" : "hidden"}
                        </Badge>
                        {product.featured ? (
                          <Badge variant="outline">featured</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductRowActions
                        productId={product.id}
                        name={product.name}
                        active={product.active}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
