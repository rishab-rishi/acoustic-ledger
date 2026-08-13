"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeCartItem, updateCartItem } from "@/actions/cart";
import { formatCents } from "@/lib/format";

type CartItemRowProps = {
  itemId: string;
  qty: number;
  stock: number;
  unitPriceCents: number;
  productName: string;
  productSlug: string;
  variantName: string;
  image?: string;
};

export function CartItemRow({
  itemId,
  qty,
  stock,
  unitPriceCents,
  productName,
  productSlug,
  variantName,
  image,
}: CartItemRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const maxQty = Math.min(20, stock);

  function changeQty(next: number) {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      try {
        const result = await updateCartItem({ itemId, qty: next });
        if (!result.ok) setIsError(true);
        setMessage(result.ok ? (result.notice ?? null) : result.error);
        router.refresh();
      } catch {
        setIsError(true);
        setMessage("Couldn't reach the store. Check your connection.");
      }
    });
  }

  function remove() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      try {
        const result = await removeCartItem({ itemId });
        if (!result.ok) {
          setIsError(true);
          setMessage(result.error);
        }
        router.refresh();
      } catch {
        setIsError(true);
        setMessage("Couldn't reach the store. Check your connection.");
      }
    });
  }

  return (
    <div className="flex gap-4 border-b border-border py-6 last:border-b-0">
      <div className="relative size-24 shrink-0 overflow-hidden border border-border bg-card">
        {image ? (
          <Image src={image} alt={productName} fill className="object-cover" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/products/${productSlug}`}
              className="text-sm font-medium hover:text-accent"
            >
              {productName}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {variantName}
            </p>
          </div>
          <p className="font-mono text-sm tabular-nums">
            {formatCents(unitPriceCents * qty)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex size-8 items-center justify-center text-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
              disabled={isPending || qty <= 1}
              onClick={() => changeQty(qty - 1)}
            >
              −
            </button>
            <span className="w-7 text-center font-mono text-xs tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex size-8 items-center justify-center text-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
              disabled={isPending || qty >= maxQty}
              onClick={() => changeQty(qty + 1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={remove}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>

        {message ? (
          <p
            className={
              isError ? "text-xs text-destructive" : "text-xs text-muted-foreground"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
