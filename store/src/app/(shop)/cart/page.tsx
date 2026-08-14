import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { CartItemRow } from "@/components/shop/cart-item-row";
import { CheckoutPanel } from "@/components/shop/checkout-panel";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { shippingForSubtotal } from "@/lib/paypal";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const [cart, session] = await Promise.all([getCart(), auth()]);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-2xl font-medium tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse the catalog and find something worth listening to.
        </p>
        <Link href="/products">
          <Button className="mt-8">Shop All Products</Button>
        </Link>
      </div>
    );
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.qty * item.variant.priceCents,
    0
  );
  const shippingCents = shippingForSubtotal(subtotalCents);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-medium tracking-tight">Cart</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
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

        <CheckoutPanel
          subtotalCents={subtotalCents}
          shippingCents={shippingCents}
          totalCents={subtotalCents + shippingCents}
          isSignedIn={Boolean(session?.user)}
          clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null}
        />
      </div>
    </div>
  );
}
