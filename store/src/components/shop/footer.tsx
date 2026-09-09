import Link from "next/link";
import { getCategories } from "@/db/queries";
import { SilkLabel } from "@/components/shop/rack";

export async function Footer() {
  const categories = await getCategories();

  return (
    <footer className="mt-auto border-t border-border-strong bg-panel-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="font-condensed text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Acoustic Ledger
          </span>
          <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-muted-foreground">
            High-fidelity studio monitors, headphones, and equalizers tuned for
            a balanced profile — accurate, not overpowering.
          </p>
        </div>

        <div>
          <SilkLabel as="h2">Shop</SilkLabel>
          <ul className="mt-3 space-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="font-mono text-[13px] text-foreground/75 transition-colors hover:text-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SilkLabel as="h2">Account</SilkLabel>
          <ul className="mt-3 space-y-2">
            <li>
              <Link
                href="/orders"
                className="font-mono text-[13px] text-foreground/75 transition-colors hover:text-accent"
              >
                Order History
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="font-mono text-[13px] text-foreground/75 transition-colors hover:text-accent"
              >
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <p className="mx-auto flex max-w-6xl items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="led-dot" aria-hidden />
          Demo store — payments run in the PayPal sandbox. No real charges.
        </p>
      </div>
    </footer>
  );
}
