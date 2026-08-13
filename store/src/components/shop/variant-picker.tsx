"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/format";

type Variant = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const firstInStock = variants.find((v) => v.stock > 0);
  const [selectedId, setSelectedId] = useState(
    (firstInStock ?? variants[0]).id
  );
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const nameById = new Map(variants.map((v) => [v.id, v.name]));
  const maxQty = Math.min(20, selected.stock);

  const stockLabel =
    selected.stock === 0
      ? "Out of stock"
      : selected.stock <= 5
        ? `Low stock — ${selected.stock} left`
        : "In stock";

  function handleSelectVariant(value: string | null) {
    if (!value) return;
    setSelectedId(value);
    setQty(1);
    setStatus("idle");
    setMessage(null);
  }

  function handleAddToCart() {
    setStatus("idle");
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await addToCart({ variantId: selected.id, qty });
        if (result.ok) {
          setStatus("added");
          setMessage(result.notice ?? null);
          router.refresh();
        } else {
          setStatus("error");
          setMessage(result.error);
          // Stock may have moved under us — re-read so the badge tells the truth.
          router.refresh();
        }
      } catch {
        // Only reached if the action call itself fails (network/transport).
        setStatus("error");
        setMessage("Couldn't reach the store. Check your connection.");
      }
    });
  }

  return (
    <div>
      <p className="font-mono text-2xl tabular-nums">
        {formatCents(selected.priceCents)}
      </p>

      {variants.length > 1 ? (
        <div className="mt-5">
          <label className="text-xs tracking-wide text-muted-foreground uppercase">
            Variant
          </label>
          <Select value={selectedId} onValueChange={handleSelectVariant}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue>
                {(value: string | null) =>
                  value ? nameById.get(value) : "Select a variant"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.name}
                  {v.stock === 0 ? " — out of stock" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Badge
        variant={selected.stock === 0 ? "destructive" : "secondary"}
        className="mt-4"
      >
        {stockLabel}
      </Badge>

      {selected.stock > 0 ? (
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex size-9 items-center justify-center text-lg text-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex size-9 items-center justify-center text-lg text-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
              disabled={qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>

          <Button
            className="flex-1"
            disabled={isPending}
            onClick={handleAddToCart}
          >
            {isPending ? "Adding…" : status === "added" ? "Added ✓" : "Add to Cart"}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p
          className={
            status === "error"
              ? "mt-3 text-sm text-destructive"
              : "mt-3 text-sm text-muted-foreground"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
