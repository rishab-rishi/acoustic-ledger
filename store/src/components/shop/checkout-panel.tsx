"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPaypalOrder } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/format";

type Props = {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  isSignedIn: boolean;
  clientId: string | null;
  demoEnabled: boolean;
};

export function CheckoutPanel({
  subtotalCents,
  shippingCents,
  totalCents,
  isSignedIn,
  clientId,
  demoEnabled,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsEmail = !isSignedIn;
  const emailLooksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canPay = !needsEmail || emailLooksValid;

  function goToOrder(orderId: string) {
    router.push(`/checkout/success?order=${encodeURIComponent(orderId)}`);
    router.refresh();
  }

  /**
   * Bypasses PayPal entirely — the server still creates and settles a real
   * order. Only mounted when the server says the fallback is enabled, and the
   * route 404s independently of this button.
   */
  async function runDemoCheckout() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/demo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsEmail ? { email: email.trim() } : {}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Demo checkout isn't available.");
        return;
      }
      goToOrder(payload.orderId);
    } catch {
      setError("Demo checkout failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-fit border border-border p-6">
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-mono tabular-nums">{formatCents(subtotalCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="font-mono tabular-nums">
            {shippingCents === 0 ? "Free" : formatCents(shippingCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2 font-medium">
          <dt>Total</dt>
          <dd className="font-mono tabular-nums">{formatCents(totalCents)}</dd>
        </div>
      </dl>

      {needsEmail ? (
        <div className="mt-5">
          <Label htmlFor="guest-email">Email for your receipt</Label>
          <Input
            id="guest-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full"
          />
        </div>
      ) : null}

      <div className="mt-5">
        {!clientId ? (
          <p className="text-sm text-muted-foreground">
            Payments aren&apos;t configured yet. Add{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>{" "}
            to <code className="font-mono text-xs">.env.local</code> — see
            PAYPAL_SETUP.md.
          </p>
        ) : (
          <div
            className={canPay ? undefined : "pointer-events-none opacity-50"}
            aria-disabled={!canPay}
          >
            <PayPalScriptProvider
              options={{ clientId, currency: "USD", intent: "capture" }}
            >
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect" }}
                disabled={!canPay || busy}
                createOrder={async () => {
                  setError(null);
                  setBusy(true);
                  const result = await createPaypalOrder(
                    needsEmail ? { email: email.trim() } : {}
                  );
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.error);
                    throw new Error(result.error);
                  }
                  return result.paypalOrderId;
                }}
                onApprove={async (data) => {
                  setBusy(true);
                  try {
                    // Settlement happens server-side; the browser only reports
                    // which PayPal order was approved.
                    const res = await fetch("/api/paypal/capture", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ paypalOrderId: data.orderID }),
                    });
                    const payload = await res.json();
                    if (!res.ok) {
                      setError(payload.error ?? "Payment could not be completed.");
                      return;
                    }
                    goToOrder(payload.orderId);
                  } catch {
                    setError(
                      "Payment was approved but confirming it failed. Check your order history before retrying."
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                onError={() => {
                  setBusy(false);
                  setError("PayPal couldn't complete this payment. Try again.");
                }}
                onCancel={() => {
                  setBusy(false);
                  setError(null);
                }}
              />
            </PayPalScriptProvider>
          </div>
        )}
      </div>

      {demoEnabled ? (
        <div className="mt-4">
          {clientId ? (
            <div className="mb-3 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!canPay || busy}
            onClick={runDemoCheckout}
          >
            Simulate payment
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Demo shortcut — places a real order without contacting PayPal.
          </p>
        </div>
      ) : null}

      {needsEmail && !emailLooksValid ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Enter your email to enable payment.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Sandbox mode — no real payment is taken. Sign in with a PayPal sandbox
        test account at checkout.
      </p>
    </div>
  );
}
