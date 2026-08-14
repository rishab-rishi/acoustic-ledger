"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

/**
 * `callbackUrl` is attacker-controllable via the query string, so only
 * same-origin destinations are honoured — otherwise /login?callbackUrl=
 * https://evil.example becomes an open redirect off the back of a real login.
 */
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    startTransition(async () => {
      try {
        if (isRegister) {
          const created = await registerUser({ name, email, password });
          if (!created.ok) {
            setError(created.error);
            return;
          }
        }

        // signIn is what triggers the guest-cart merge (see auth.ts).
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          setError(
            isRegister
              ? "Account created, but signing in failed. Try logging in."
              : "Incorrect email or password."
          );
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError("Couldn't reach the store. Check your connection.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-medium tracking-tight">
        {isRegister ? "Create an account" : "Sign in"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isRegister
          ? "Your cart carries over once you're signed in."
          : "Welcome back."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {isRegister ? (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              className="mt-1.5 w-full"
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 w-full"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
            className="mt-1.5 w-full"
          />
          {isRegister ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? isRegister
              ? "Creating account…"
              : "Signing in…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "No account yet? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="text-foreground underline underline-offset-4 hover:text-accent"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
