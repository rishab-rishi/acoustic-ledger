import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { getCategories } from "@/db/queries";

export async function Header() {
  const categories = await getCategories();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase">
            Acoustic Ledger
          </span>
          <span className="text-[11px] tracking-wide text-muted-foreground">
            Balanced by design
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link
            href="/products"
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            All Products
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="text-foreground/80 transition-colors hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            aria-label="Account"
            className="text-foreground/70 transition-colors hover:text-accent"
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative text-foreground/70 transition-colors hover:text-accent"
          >
            <ShoppingBag className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
