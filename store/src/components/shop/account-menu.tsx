import Link from "next/link";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { auth, signOut } from "@/auth";

export async function AccountMenu() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="text-foreground/70 transition-colors hover:text-accent"
      >
        <User className="size-5" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.role === "admin" ? (
        <Link
          href="/admin"
          aria-label="Admin dashboard"
          className="text-foreground/70 transition-colors hover:text-accent"
        >
          <LayoutDashboard className="size-5" />
        </Link>
      ) : null}

      <Link
        href="/orders"
        className="hidden text-sm text-foreground/80 transition-colors hover:text-accent sm:inline"
      >
        {user.name?.split(" ")[0] ?? "Account"}
      </Link>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          aria-label="Sign out"
          className="flex text-foreground/70 transition-colors hover:text-accent"
        >
          <LogOut className="size-5" />
        </button>
      </form>
    </div>
  );
}
