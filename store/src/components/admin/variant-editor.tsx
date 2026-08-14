"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput, parseDollarsToCents } from "@/lib/format";

type Variant = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
};

type Draft = { name: string; sku: string; price: string; stock: string };

/** Shared validation for both the edit rows and the add row. */
function readDraft(draft: Draft):
  | { ok: true; value: { name: string; sku: string; priceCents: number; stock: number } }
  | { ok: false; error: string } {
  const priceCents = parseDollarsToCents(draft.price);
  if (priceCents === null) return { ok: false, error: "Enter a price like 249.00." };

  const stock = Number.parseInt(draft.stock, 10);
  if (!Number.isFinite(stock) || stock < 0) {
    return { ok: false, error: "Enter a whole number for stock." };
  }
  if (!draft.name.trim()) return { ok: false, error: "Variant name is required." };
  if (!draft.sku.trim()) return { ok: false, error: "SKU is required." };

  return {
    ok: true,
    value: {
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      priceCents,
      stock,
    },
  };
}

function VariantRow({
  variant,
  canDelete,
  onDone,
}: {
  variant: Variant;
  canDelete: boolean;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: variant.name,
    sku: variant.sku,
    price: centsToDollarInput(variant.priceCents),
    stock: String(variant.stock),
  });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    draft.name !== variant.name ||
    draft.sku !== variant.sku ||
    draft.price !== centsToDollarInput(variant.priceCents) ||
    draft.stock !== String(variant.stock);

  async function save() {
    const parsed = readDraft(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await updateVariant({ variantId: variant.id, ...parsed.value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const result = await deleteVariant({ variantId: variant.id });
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_auto] sm:items-end">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="mt-1"
            aria-label={`Variant name for ${variant.sku}`}
          />
        </div>
        <div>
          <Label className="text-xs">SKU</Label>
          <Input
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
            className="mt-1 font-mono text-sm"
            aria-label={`SKU for ${variant.sku}`}
          />
        </div>
        <div>
          <Label className="text-xs">Price</Label>
          <Input
            inputMode="decimal"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            className="mt-1 font-mono"
            aria-label={`Price for ${variant.sku}`}
          />
        </div>
        <div>
          <Label className="text-xs">Stock</Label>
          <Input
            inputMode="numeric"
            value={draft.stock}
            onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
            className="mt-1 font-mono"
            aria-label={`Stock for ${variant.sku}`}
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            disabled={busy || !dirty}
            onClick={save}
            type="button"
          >
            {saved && !dirty ? "Saved" : "Save"}
          </Button>
          {confirming ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={remove}
                type="button"
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirming(false)}
                type="button"
              >
                Keep
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || !canDelete}
              title={
                canDelete ? undefined : "A product needs at least one variant."
              }
              onClick={() => setConfirming(true)}
              type="button"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function VariantEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    sku: "",
    price: "",
    stock: "0",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const parsed = readDraft(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createVariant({ productId, ...parsed.value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft({ name: "", sku: "", price: "", stock: "0" });
      setAdding(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide uppercase">
          Variants
          <span className="ml-2 font-normal text-muted-foreground normal-case">
            {variants.length}
          </span>
        </h2>
        {!adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add variant
          </Button>
        ) : null}
      </div>

      {variants.map((v) => (
        <VariantRow
          key={v.id}
          variant={v}
          canDelete={variants.length > 1}
          onDone={() => router.refresh()}
        />
      ))}

      {adding ? (
        <div className="border-t border-border bg-muted/30 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_auto] sm:items-end">
            <div>
              <Label className="text-xs" htmlFor="new-variant-name">
                Name
              </Label>
              <Input
                id="new-variant-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="new-variant-sku">
                SKU
              </Label>
              <Input
                id="new-variant-sku"
                value={draft.sku}
                onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="new-variant-price">
                Price
              </Label>
              <Input
                id="new-variant-price"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="new-variant-stock">
                Stock
              </Label>
              <Input
                id="new-variant-stock"
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" disabled={busy} onClick={add} type="button">
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
