"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { LedReadout, StockMeter } from "@/components/shop/rack";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const firstInStock = variants.find((v) => v.stock > 0);
  const [selectedId, setSelectedId] = useState((firstInStock ?? variants[0]).id);
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const maxQty = Math.min(20, selected.stock);

  const stockLabel =
    selected.stock === 0
      ? "Out of stock"
      : selected.stock <= 5
        ? `Low stock — ${selected.stock} left`
        : "In stock";

  function selectVariant(id: string) {
    setSelectedId(id);
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
          router.refresh();
        }
      } catch {
        setStatus("error");
        setMessage("Couldn't reach the store. Check your connection.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <LedReadout tone="neutral" className="px-3 py-1.5 text-2xl">
          {formatCents(selected.priceCents)}
        </LedReadout>
        <StockMeter totalStock={selected.stock} />
      </div>

      {variants.length > 1 ? (
        <fieldset className="mt-6">
          <legend className="silkscreen mb-2">Variant</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSel = v.id === selectedId;
              const isOut = v.stock === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isOut}
                  aria-pressed={isSel}
                  onClick={() => selectVariant(v.id)}
                  className={cn(
                    "border px-3 py-2 font-mono text-[13px] transition-colors",
                    isSel
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-panel text-muted-foreground hover:border-border-strong hover:text-foreground",
                    isOut && "cursor-not-allowed opacity-40 line-through"
                  )}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <p
        className={cn(
          "mt-4 font-mono text-[11px] uppercase tracking-[0.14em]",
          selected.stock === 0 ? "text-ramp-1" : "text-muted-foreground"
        )}
      >
        {stockLabel}
      </p>

      {selected.stock > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="panel-inset flex items-center">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex size-10 items-center justify-center font-mono text-lg text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              disabled={qty <= 1}
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              −
            </button>
            <span className="w-9 text-center font-mono text-sm tabular-nums text-foreground">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex size-10 items-center justify-center font-mono text-lg text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              disabled={qty >= maxQty}
              onClick={() => setQty((n) => Math.min(maxQty, n + 1))}
            >
              +
            </button>
          </div>

          <Button
            size="lg"
            className="h-10 flex-1 font-mono text-[13px] uppercase tracking-[0.14em]"
            disabled={isPending}
            onClick={handleAddToCart}
          >
            {isPending ? "Adding…" : status === "added" ? "Added ✓" : "Add to cart"}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p
          className={cn(
            "mt-3 font-sans text-sm",
            status === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
