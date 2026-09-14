import type { Metadata } from "next";
import { LedReadout, SilkLabel } from "@/components/shop/rack";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Acoustic Ledger.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <SilkLabel>Legal</SilkLabel>
      <h1 className="mt-2 font-condensed text-3xl font-bold uppercase tracking-[0.02em] text-foreground sm:text-4xl">
        Terms of Use
      </h1>

      <div className="panel relative mt-6 flex items-start gap-3 p-4">
        <LedReadout tone="warn" className="shrink-0 px-2 py-1 text-xs">
          !
        </LedReadout>
        <p className="font-sans text-sm leading-relaxed text-foreground">
          <strong>Placeholder text, not legal advice.</strong> Acoustic Ledger
          is a demonstration storefront with a fictional catalog and no real
          transactions outside the PayPal sandbox. This page exists to show
          where a real store&apos;s terms would live; it has not been reviewed by a
          lawyer and must not be treated as binding until it is, before this
          site (or one built from it) ever handles a real order.
        </p>
      </div>

      <div className="mt-10 space-y-8 font-sans text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            1. Acceptance of terms
          </h2>
          <p className="mt-2">
            By using this site, you agree to these placeholder terms exactly
            as far as a fictional demo store requires you to — which is not
            far. No purchase made here is real; every checkout runs against
            PayPal&apos;s sandbox environment and settles no real money.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            2. Products and pricing
          </h2>
          <p className="mt-2">
            Every product, price, and stock level shown is part of a
            fictional demo catalog and does not represent a real, purchasable
            good. Nothing on this site should be relied on as an actual offer
            to sell.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            3. Orders and payment
          </h2>
          <p className="mt-2">
            Checkout is processed through PayPal&apos;s sandbox — see the
            notice in the footer of every page. No real payment method is
            charged, and any &quot;order&quot; placed here exists only in this
            demo&apos;s database.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            4. Intellectual property
          </h2>
          <p className="mt-2">
            The site&apos;s design, code, and copy are proprietary — see the
            repository&apos;s <code>LICENSE</code> file. The product images
            are original, procedurally generated artwork, not photographs of
            real goods.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            5. Limitation of liability
          </h2>
          <p className="mt-2">
            This is placeholder language for a demo project. A real
            deployment needs real, jurisdiction-appropriate terms drafted or
            reviewed by a lawyer before it handles genuine orders or customer
            data.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            6. Changes to these terms
          </h2>
          <p className="mt-2">
            These placeholder terms may change at any time without notice, as
            befits a page that exists to be replaced.
          </p>
        </section>
      </div>
    </div>
  );
}
