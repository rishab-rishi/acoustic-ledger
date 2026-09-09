import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { AccountMenu } from "@/components/shop/account-menu";
import { MobileNav } from "@/components/shop/mobile-nav";
import { getCategories } from "@/db/queries";
import { getCartItemCount } from "@/lib/cart";

export async function Header() {
  const [categories, cartCount] = await Promise.all([
    getCategories(),
    getCartItemCount(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-panel/95 backdrop-blur supports-backdrop-filter:bg-panel/80">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Acoustic Ledger — home"
        >
          <span className="flex h-8 items-center gap-1.5 rounded-[2px] border border-border bg-panel-sunken px-2 shadow-[inset_0_1px_2px_rgba(0,0,0,.6)] sm:gap-2 sm:px-2.5">
            <span className="led-dot" aria-hidden />
            <span className="font-condensed text-[13px] font-bold uppercase leading-none tracking-[0.14em] text-foreground sm:text-[15px] sm:tracking-[0.18em]">
              Acoustic&nbsp;Ledger
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-5 md:flex">
          <Link
            href="/products"
            className="silkscreen transition-colors hover:text-foreground"
          >
            All Units
          </Link>
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="silkscreen transition-colors hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 sm:gap-4">
          <Link
            href="/products"
            aria-label="Search products"
            className="flex text-muted-foreground transition-colors hover:text-accent"
          >
            <Search className="size-4.5" />
          </Link>
          <AccountMenu />
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="flex items-center gap-1.5 rounded-[2px] border border-border bg-panel-sunken px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="size-4" />
            <span
              className="led-readout min-w-[1.25ch] text-center text-[13px] font-medium"
              style={
                cartCount === 0
                  ? { color: "#3a3a37", textShadow: "none" }
                  : undefined
              }
            >
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          </Link>

          <MobileNav categories={categories} />
        </div>
      </div>
    </header>
  );
}
