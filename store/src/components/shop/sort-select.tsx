"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductSort } from "@/db/queries";

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
];

const LABELS = new Map(OPTIONS.map((o) => [o.value, o.label]));

export function SortSelect({ value }: { value: ProductSort }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(next: string | null) {
    if (!next) return;

    // Carry the other filters through untouched — sorting shouldn't silently
    // drop the search term or the category the user picked.
    const params = new URLSearchParams(searchParams.toString());
    if (next === "relevance") params.delete("sort");
    else params.set("sort", next);

    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="sort"
        className="text-xs tracking-wide text-muted-foreground uppercase"
      >
        Sort
      </label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="sort" className="h-9 w-48">
          <SelectValue>
            {(v: string | null) => (v ? LABELS.get(v as ProductSort) : "Relevance")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
