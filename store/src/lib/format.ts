const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

/**
 * Admin forms take dollars because that's what a person types; everything past
 * this boundary is integer cents (build spec §3, rule 3). Rounds rather than
 * truncates so "19.99" can't land as 1998.
 *
 * Returns null for anything that isn't a plain amount, which the caller turns
 * into a field error.
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Inverse of the above, for pre-filling an edit form. */
export function centsToDollarInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
