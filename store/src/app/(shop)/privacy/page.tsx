import type { Metadata } from "next";
import { LedReadout, SilkLabel } from "@/components/shop/rack";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Acoustic Ledger.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <SilkLabel>Legal</SilkLabel>
      <h1 className="mt-2 font-condensed text-3xl font-bold uppercase tracking-[0.02em] text-foreground sm:text-4xl">
        Privacy Policy
      </h1>

      <div className="panel relative mt-6 flex items-start gap-3 p-4">
        <LedReadout tone="warn" className="shrink-0 px-2 py-1 text-xs">
          !
        </LedReadout>
        <p className="font-sans text-sm leading-relaxed text-foreground">
          <strong>Placeholder text, not legal advice.</strong> Acoustic Ledger
          is a demonstration storefront. This page exists to show where a
          real store&apos;s privacy policy would live; it has not been
          reviewed by a lawyer and must not be treated as binding until it is,
          before this site (or one built from it) ever handles real customer
          data.
        </p>
      </div>

      <div className="mt-10 space-y-8 font-sans text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            1. Information we collect
          </h2>
          <p className="mt-2">
            Account sign-up collects a name, email, and password (stored as a
            salted hash, never in plain text). Checkout collects an email
            address and, on a completed sandbox purchase, a shipping address
            returned by PayPal. Signing in with Google, where enabled,
            provides the profile information Google shares under its own
            consent flow.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            2. How we use it
          </h2>
          <p className="mt-2">
            Solely to operate the demo: identifying your account and cart,
            processing a sandbox order, and showing your own order history.
            Nothing collected here is sold, shared with advertisers, or used
            for marketing.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            3. Cookies
          </h2>
          <p className="mt-2">
            A session cookie identifies your signed-in account, and a
            separate cookie identifies a guest shopping cart before you sign
            in. Both are functional, not tracking or advertising, cookies.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            4. Third-party services
          </h2>
          <p className="mt-2">
            Checkout is handled by PayPal&apos;s sandbox environment, subject
            to PayPal&apos;s own privacy policy. No real payment credentials
            are ever seen or stored by this site.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            5. Data retention and your rights
          </h2>
          <p className="mt-2">
            This is placeholder language for a demo project. A real deployment
            needs a real retention policy and a real process for data-access
            and deletion requests, appropriate to wherever its users are
            located, reviewed by a lawyer before it handles genuine customer
            data.
          </p>
        </section>

        <section>
          <h2 className="font-condensed text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
            6. Changes to this policy
          </h2>
          <p className="mt-2">
            This placeholder policy may change at any time without notice, as
            befits a page that exists to be replaced.
          </p>
        </section>
      </div>
    </div>
  );
}
