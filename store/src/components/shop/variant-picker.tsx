"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/format";

type Variant = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const firstInStock = variants.find((v) => v.stock > 0);
  const [selectedId, setSelectedId] = useState(
    (firstInStock ?? variants[0]).id
  );
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const nameById = new Map(variants.map((v) => [v.id, v.name]));

  const stockLabel =
    selected.stock === 0
      ? "Out of stock"
      : selected.stock <= 5
        ? `Low stock — ${selected.stock} left`
        : "In stock";

  return (
    <div>
      <p className="font-mono text-2xl tabular-nums">
        {formatCents(selected.priceCents)}
      </p>

      {variants.length > 1 ? (
        <div className="mt-5">
          <label className="text-xs tracking-wide text-muted-foreground uppercase">
            Variant
          </label>
          <Select
            value={selectedId}
            onValueChange={(value) => {
              if (value) setSelectedId(value);
            }}
          >
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue>
                {(value: string | null) =>
                  value ? nameById.get(value) : "Select a variant"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.name}
                  {v.stock === 0 ? " — out of stock" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Badge
        variant={selected.stock === 0 ? "destructive" : "secondary"}
        className="mt-4"
      >
        {stockLabel}
      </Badge>
    </div>
  );
}
