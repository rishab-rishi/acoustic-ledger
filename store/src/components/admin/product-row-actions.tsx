"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, setProductActive } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";

type Props = { productId: string; name: string; active: boolean };

export function ProductRowActions({ productId, name, active }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || isPending;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setConfirming(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => run(() => deleteProduct({ productId }))}
          >
            Delete “{name}”
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Past orders keep their own copy of the details.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => run(() => setProductActive({ productId, active: !active }))}
        >
          {active ? "Hide" : "Publish"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => setConfirming(true)}
        >
          Delete
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
