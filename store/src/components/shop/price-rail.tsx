"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type CatalogParams, catalogHref } from "@/lib/catalog-url";
import { formatCents } from "@/lib/format";

/**
 * The price control on the channel strip is a real fader. Dragging it marks the
 * rack live — product rows outside the range dim before you commit — and lets
 * go to load the filtered set. Rows carry `data-price` (dollars) and live in a
 * container marked `data-price-scope`.
 */
export function PriceRail({
  params,
  floorCents,
  ceilCents,
}: {
  params: CatalogParams;
  floorCents: number;
  ceilCents: number;
}) {
  const router = useRouter();
  const floor = Math.floor(floorCents / 100);
  const ceil = Math.ceil(ceilCents / 100);

  const [lo, setLo] = useState(() =>
    params.min ? Math.max(floor, Math.round(Number(params.min))) : floor
  );
  const [hi, setHi] = useState(() =>
    params.max ? Math.min(ceil, Math.round(Number(params.max))) : ceil
  );
  const dragging = useRef(false);

  // Paint the preview: dim every row whose price falls outside [lo, hi].
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLElement>("[data-price]");
    let hiddenCount = 0;
    rows.forEach((row) => {
      const price = Number(row.dataset.price);
      const inRange = price >= lo && price <= hi;
      row.style.opacity = inRange ? "" : "0.28";
      row.style.filter = inRange ? "" : "saturate(0.4)";
      if (!inRange) hiddenCount += 1;
    });
    const readout = document.getElementById("price-rail-count");
    if (readout) {
      readout.textContent =
        hiddenCount > 0 ? `${rows.length - hiddenCount} / ${rows.length}` : "";
    }
    return () => {
      rows.forEach((row) => {
        row.style.opacity = "";
        row.style.filter = "";
      });
    };
  }, [lo, hi]);

  function commit(nextLo: number, nextHi: number) {
    dragging.current = false;
    router.push(
      catalogHref(params, {
        min: nextLo > floor ? String(nextLo) : undefined,
        max: nextHi < ceil ? String(nextHi) : undefined,
      })
    );
  }

  const pct = (v: number) => ((v - floor) / (ceil - floor)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="price-lo" className="silkscreen">
          Price
        </label>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {formatCents(lo * 100)} – {formatCents(hi * 100)}
          <span
            id="price-rail-count"
            className="ml-2 text-[color:var(--ramp-2)]"
            aria-hidden
          />
        </span>
      </div>

      <div className="relative mt-3 h-6">
        {/* fader track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[1px] bg-panel-sunken shadow-[inset_0_1px_2px_rgba(0,0,0,.7)]" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-[1px] bg-[color:var(--ramp-2)]/70"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          id="price-lo"
          type="range"
          min={floor}
          max={ceil}
          value={lo}
          aria-label="Minimum price"
          onPointerDown={() => (dragging.current = true)}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-strong [&::-webkit-slider-thumb]:bg-[#3a3a37] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]"
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          value={hi}
          aria-label="Maximum price"
          onPointerDown={() => (dragging.current = true)}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-strong [&::-webkit-slider-thumb]:bg-[#3a3a37] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]"
        />
      </div>
    </div>
  );
}
