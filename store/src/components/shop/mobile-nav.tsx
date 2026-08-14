"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type Category = { id: string; name: string; slug: string };

/**
 * Category navigation for narrow screens, where the header's inline nav is
 * hidden. Without this the only route into a category on a phone is the
 * search icon, which is a discovery dead end.
 *
 * Deliberately a plain disclosure rather than a modal sheet: no focus trap to
 * get wrong, no scroll locking, and it degrades to a visible list.
 */
export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  // Client components survive navigation within a layout, so the panel would
  // otherwise stay open over the page the user just chose. Closing on the
  // click itself rather than in an effect keyed to the pathname: the effect
  // version sets state during render-commit, which react-hooks flags, and
  // this reads more directly anyway.
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex text-foreground/70 transition-colors hover:text-accent"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-border bg-background"
        >
          <nav className="mx-auto max-w-6xl px-6 py-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/products"
                  onClick={close}
                  className="block py-2 text-sm text-foreground/80 transition-colors hover:text-accent"
                >
                  All Products
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    onClick={close}
                    className="block py-2 text-sm text-foreground/80 transition-colors hover:text-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
