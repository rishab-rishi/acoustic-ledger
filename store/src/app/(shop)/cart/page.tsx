import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { CartItemRow } from "@/components/shop/cart-item-row";
import { CheckoutPanel } from "@/components/shop/checkout-panel";
import { DeadKeys, SilkLabel } from "@/components/shop/rack";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { isDemoCheckoutEnabled } from "@/lib/demo-checkout";
import { shippingForSubtotal } from "@/lib/paypal";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const [cart, session] = await Promise.all([getCart(), auth()]);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <DeadKeys />
        <h1 className="mt-7 font-condensed text-2xl font-bold uppercase tracking-[0.04em] text-foreground">
          The cart is empty
        </h1>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          Load a unit from the rack and it shows up here.
        </p>
        <Button className="mt-8" render={<Link href="/products" />}>
          Browse all units
        </Button>
      </div>
    );
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.qty * item.variant.priceCents,
    0
  );
  const shippingCents = shippingForSubtotal(subtotalCents);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-[0.04em] text-foreground sm:text-3xl">
          Cart
        </h1>
        <span className="led-readout text-sm">
          {String(items.reduce((n, i) => n + i.qty, 0)).padStart(2, "0")}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="panel relative divide-y divide-border">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              itemId={item.id}
              qty={item.qty}
              stock={item.variant.stock}
              unitPriceCents={item.variant.priceCents}
              productName={item.variant.product.name}
              productSlug={item.variant.product.slug}
              variantName={item.variant.name}
              image={item.variant.product.images[0]}
            />
          ))}
        </div>

        <div>
          <SilkLabel as="h2" className="mb-2 block">
            Sum
          </SilkLabel>
          <CheckoutPanel
            subtotalCents={subtotalCents}
            shippingCents={shippingCents}
            totalCents={subtotalCents + shippingCents}
            isSignedIn={Boolean(session?.user)}
            clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null}
            demoEnabled={isDemoCheckoutEnabled()}
          />
        </div>
      </div>
    </div>
  );
}
