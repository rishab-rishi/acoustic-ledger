"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProduct, updateProduct } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centsToDollarInput, parseDollarsToCents, slugify } from "@/lib/format";

type Category = { id: string; name: string };

type ExistingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  basePriceCents: number;
  images: string[];
  featured: boolean;
  active: boolean;
};

type Props = {
  categories: Category[];
  product?: ExistingProduct;
};

export function ProductForm({ categories, product }: Props) {
  const router = useRouter();
  const editing = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? ""
  );
  const [price, setPrice] = useState(
    product ? centsToDollarInput(product.basePriceCents) : ""
  );
  const [images, setImages] = useState((product?.images ?? []).join("\n"));
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);

  // Only used when creating: a product needs one variant to be sellable.
  const [vName, setVName] = useState("Standard");
  const [vSku, setVSku] = useState("");
  const [vPrice, setVPrice] = useState("");
  const [vStock, setVStock] = useState("0");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  function handleNameChange(value: string) {
    setName(value);
    // Typing a name fills the slug until the admin edits it themselves.
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const basePriceCents = parseDollarsToCents(price);
    if (basePriceCents === null) {
      setError("Enter a base price like 249.00.");
      return;
    }

    const base = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      categoryId,
      basePriceCents,
      images: images
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      featured,
      active,
    };

    setBusy(true);
    try {
      if (product) {
        const result = await updateProduct({ ...base, productId: product.id });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNotice(result.notice ?? "Saved.");
        router.refresh();
        return;
      }

      const variantPriceCents = parseDollarsToCents(vPrice || price);
      if (variantPriceCents === null) {
        setError("Enter a variant price like 249.00.");
        return;
      }
      const stock = Number.parseInt(vStock, 10);
      if (!Number.isFinite(stock) || stock < 0) {
        setError("Enter a whole number for stock.");
        return;
      }

      const result = await createProduct({
        ...base,
        variant: {
          name: vName.trim(),
          sku: vSku.trim() || `${slugify(base.slug).toUpperCase()}-STD`,
          priceCents: variantPriceCents,
          stock,
        },
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/products/${result.productId}/edit`);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="mt-1.5 font-mono text-sm"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            /products/{slug || "…"}
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="mt-1.5"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={categoryId}
            onValueChange={(value: string | null) => value && setCategoryId(value)}
          >
            <SelectTrigger id="category" className="mt-1.5 w-full">
              <SelectValue>
                {(value: string | null) =>
                  value ? categoryName.get(value) : "Select a category"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="price">Base price (USD)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="249.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1.5 font-mono"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown as the &ldquo;from&rdquo; price; variants carry the real price.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="images">Images</Label>
        <Textarea
          id="images"
          value={images}
          onChange={(e) => setImages(e.target.value)}
          rows={3}
          placeholder="/products/datum-5-1.webp"
          className="mt-1.5 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          One path or URL per line. First is the card thumbnail.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={active}
            onCheckedChange={(v: boolean) => setActive(Boolean(v))}
          />
          Visible in the store
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={featured}
            onCheckedChange={(v: boolean) => setFeatured(Boolean(v))}
          />
          Featured on the homepage
        </label>
      </div>

      {!editing ? (
        <fieldset className="border border-border p-5">
          <legend className="px-2 text-xs tracking-wide text-muted-foreground uppercase">
            First variant
          </legend>
          <p className="mb-4 text-xs text-muted-foreground">
            Every product needs at least one. You can add more after saving.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="v-name">Name</Label>
              <Input
                id="v-name"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="v-sku">SKU</Label>
              <Input
                id="v-sku"
                value={vSku}
                onChange={(e) => setVSku(e.target.value)}
                placeholder="auto"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="v-price">Price (USD)</Label>
              <Input
                id="v-price"
                inputMode="decimal"
                value={vPrice}
                onChange={(e) => setVPrice(e.target.value)}
                placeholder={price || "249.00"}
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="v-stock">Stock</Label>
              <Input
                id="v-stock"
                inputMode="numeric"
                value={vStock}
                onChange={(e) => setVStock(e.target.value)}
                className="mt-1.5 font-mono"
                required
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
