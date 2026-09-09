"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeCartItem, updateCartItem } from "@/actions/cart";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    <div className="flex gap-4 p-4">
      <div className="panel-inset relative size-20 shrink-0 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={productName}
            fill
            sizes="80px"
            className="spec-photo object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/products/${productSlug}`}
              className="font-condensed text-base font-semibold uppercase leading-tight tracking-[0.02em] text-foreground transition-colors hover:text-accent"
            >
              {productName}
            </Link>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {variantName}
            </p>
          </div>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {formatCents(unitPriceCents * qty)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="panel-inset flex items-center">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex size-8 items-center justify-center font-mono text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              disabled={isPending || qty <= 1}
              onClick={() => changeQty(qty - 1)}
            >
              −
            </button>
            <span className="w-7 text-center font-mono text-xs tabular-nums text-foreground">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex size-8 items-center justify-center font-mono text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>

        {message ? (
          <p
            className={cn(
              "font-sans text-xs",
              isError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
