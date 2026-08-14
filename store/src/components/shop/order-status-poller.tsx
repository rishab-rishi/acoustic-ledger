"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Refreshes the server component until the order leaves `pending`.
 *
 * This only re-reads state — it never tells the server an order is paid. Only
 * the capture route and the webhook can do that, both server-side and both
 * against PayPal's own response.
 */
export function OrderStatusPoller({ intervalMs = 2000, maxAttempts = 15 }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= maxAttempts) return;
    const timer = setTimeout(() => {
      setAttempts((n) => n + 1);
      router.refresh();
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [attempts, intervalMs, maxAttempts, router]);

  if (attempts >= maxAttempts) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        This is taking longer than usual. Your payment is safe — refresh in a
        moment, or check your order history.
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
      Confirming payment…
    </p>
  );
}
