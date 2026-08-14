"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrder, fulfilOrder } from "@/actions/admin-orders";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/db/admin-queries";

type Props = { orderId: string; status: OrderStatus };

export function OrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Cancelling restocks and can't be undone, so it takes two clicks.
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const disabled = busy || pending;

  async function run(fn: () => Promise<{ ok: boolean; error?: string; notice?: string }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setNotice(result.notice ?? null);
      setConfirmingCancel(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const isTerminal = status === "fulfilled" || status === "cancelled";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "paid" ? (
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => run(() => fulfilOrder({ orderId }))}
          >
            Mark fulfilled
          </Button>
        ) : null}

        {!isTerminal ? (
          confirmingCancel ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={disabled}
                onClick={() => run(() => cancelOrder({ orderId }))}
              >
                {status === "paid" ? "Confirm — cancel and restock" : "Confirm cancel"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => setConfirmingCancel(false)}
              >
                Keep order
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel order
            </Button>
          )
        ) : null}

        {isTerminal ? (
          <p className="text-sm text-muted-foreground">
            This order is {status} — no further changes.
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {notice ? (
        <p className="mt-3 text-sm text-muted-foreground">{notice}</p>
      ) : null}
    </div>
  );
}
