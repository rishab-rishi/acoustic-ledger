import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin · Acoustic Ledger",
  },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Every admin page inherits this check, so a new page under /admin is gated
  // by default rather than by remembering to add a guard.
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Link
              href="/admin"
              className="font-mono text-sm font-semibold tracking-[0.2em] uppercase"
            >
              Admin
            </Link>
            <span className="text-xs text-muted-foreground">
              {admin.name ?? admin.email}
            </span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-3.5" />
            Back to store
          </Link>
        </div>

        <AdminNav />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
