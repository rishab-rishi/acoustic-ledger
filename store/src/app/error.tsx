"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches render/data errors below the root layout.
 *
 * The message is deliberately not shown: in production React strips it to a
 * digest anyway, and echoing raw server errors at a visitor tells them
 * nothing useful while potentially leaking internals. The digest is surfaced
 * instead so a report can be matched to a server log line.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
        Error
      </p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        Something went wrong on our end
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This one is on us, not you. Try again — if it keeps happening, head back
        to the catalog.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/products" />}>
          Back to the catalog
        </Button>
      </div>

      {error.digest ? (
        <p className="mt-8 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
