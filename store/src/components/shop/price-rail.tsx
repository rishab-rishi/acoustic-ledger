"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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

  const deriveLo = () =>
    params.min ? Math.max(floor, Math.round(Number(params.min))) : floor;
  const deriveHi = () =>
    params.max ? Math.min(ceil, Math.round(Number(params.max))) : ceil;

  const [lo, setLo] = useState(deriveLo);
  const [hi, setHi] = useState(deriveHi);
  const dragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const loInputRef = useRef<HTMLInputElement>(null);
  const hiInputRef = useRef<HTMLInputElement>(null);

  // The lo/hi inputs are two full-width range inputs stacked on top of each
  // other so they read as one dual-handle fader. Whichever one has the
  // higher z-index is the only one that can receive a click anywhere on its
  // track, so this lifts whichever handle the pointer is nearer to —
  // otherwise most of the track would belong exclusively to whichever input
  // happened to be on top, and the other handle could only ever be grabbed
  // at the exact pixel it currently sits on. It writes the z-index straight
  // to the DOM rather than through React state: a pointerdown can follow a
  // pointermove in the same tick, before a state-driven re-render would
  // have committed, and the browser hit-tests against whatever z-index is
  // on the element *right now* — a stale one grabs the wrong handle.
  function updateTopThumb(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const value = floor + fraction * (ceil - floor);
    const loOnTop = Math.abs(value - lo) <= Math.abs(value - hi);
    if (loInputRef.current) loInputRef.current.style.zIndex = loOnTop ? "2" : "1";
    if (hiInputRef.current) hiInputRef.current.style.zIndex = loOnTop ? "1" : "2";
  }

  // The useState initializers above only run on mount. Client-side
  // navigations that change ?min/?max (Clear all, a category/sort link while
  // a price filter is active, browser back/forward) reuse this component
  // instance rather than remounting it, so without this the fader and its
  // readout would keep showing whatever range was active before the nav even
  // though the results on screen are no longer filtered by it. Comparing
  // against the last-seen params during render (rather than in an effect)
  // resets the state before this render commits, instead of after.
  const [prevParams, setPrevParams] = useState(params);
  if (prevParams.min !== params.min || prevParams.max !== params.max) {
    setPrevParams(params);
    setLo(deriveLo());
    setHi(deriveHi());
  }

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

      <div
        ref={trackRef}
        className="relative mt-3 h-6"
        onPointerMove={(e) => {
          if (!dragging.current) updateTopThumb(e.clientX);
        }}
        onPointerDown={(e) => updateTopThumb(e.clientX)}
      >
        {/* fader track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[1px] bg-panel-sunken shadow-[inset_0_1px_2px_rgba(0,0,0,.7)]" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-[1px] bg-[color:var(--ramp-2)]/70"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          ref={loInputRef}
          id="price-lo"
          type="range"
          min={floor}
          max={ceil}
          value={lo}
          aria-label="Minimum price"
          style={{ zIndex: 2 }}
          onPointerDown={() => (dragging.current = true)}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className={cn(
            "absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-strong [&::-webkit-slider-thumb]:bg-[#3a3a37] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]",
            "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-[2px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border-strong [&::-moz-range-thumb]:bg-[#3a3a37] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]"
          )}
        />
        <input
          ref={hiInputRef}
          type="range"
          min={floor}
          max={ceil}
          value={hi}
          aria-label="Maximum price"
          style={{ zIndex: 1 }}
          onPointerDown={() => (dragging.current = true)}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className={cn(
            "absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-strong [&::-webkit-slider-thumb]:bg-[#3a3a37] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]",
            "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-[2px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border-strong [&::-moz-range-thumb]:bg-[#3a3a37] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,.6)]"
          )}
        />
      </div>
    </div>
  );
}
