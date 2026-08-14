import Link from "next/link";
import { getCategories } from "@/db/queries";

export async function Footer() {
  const categories = await getCategories();

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-3">
        <div>
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase">
            Acoustic Ledger
          </span>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            High-fidelity studio monitors, headphones, and equalizers tuned
            for a balanced profile — accurate, not overpowering.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Shop
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Account
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/orders"
                className="text-foreground/80 transition-colors hover:text-accent"
              >
                Order History
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="text-foreground/80 transition-colors hover:text-accent"
              >
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          Demo store. Payments run in the PayPal sandbox — no real charges.
        </p>
      </div>
    </footer>
  );
}
