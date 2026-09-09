import { cn } from "@/lib/utils";

/**
 * "The Rack" world primitives. A module is a matte faceplate; rivets sit at its
 * corners; stock and price read out on an LED ladder in the 808 velocity ramp
 * (red = empty, orange/yellow = low, white = full). LEDs are the only light.
 */

export function Rivets({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      <span className="rivet left-2 top-2" />
      <span className="rivet right-2 top-2" />
      <span className="rivet bottom-2 left-2" />
      <span className="rivet bottom-2 right-2" />
    </div>
  );
}

function stockTier(totalStock: number): {
  rung: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (totalStock <= 0)
    return { rung: 0, label: "Out of stock", color: "var(--ramp-1)" };
  if (totalStock <= 5)
    return { rung: 1, label: `${totalStock} left`, color: "var(--ramp-1)" };
  if (totalStock <= 20)
    return { rung: 2, label: "Low stock", color: "var(--ramp-2)" };
  if (totalStock <= 60)
    return { rung: 3, label: "In stock", color: "var(--ramp-3)" };
  return { rung: 4, label: "In stock", color: "var(--ramp-4)" };
}

/**
 * A 4-segment LED bar-graph meter for stock level, plus its silkscreen reading.
 */
export function StockMeter({
  totalStock,
  showLabel = true,
  className,
}: {
  totalStock: number;
  showLabel?: boolean;
  className?: string;
}) {
  const { rung, label, color } = stockTier(totalStock);
  const out = rung === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((seg) => {
          const lit = seg <= rung;
          return (
            <span
              key={seg}
              className="h-3.5 w-1.5 rounded-[1px]"
              style={
                lit
                  ? { background: color, boxShadow: "var(--led-shadow)" }
                  : { background: "#2a2a27", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.5)" }
              }
            />
          );
        })}
      </div>
      {showLabel ? (
        <span
          className="silkscreen"
          style={out ? { color: "var(--ramp-1)" } : undefined}
        >
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

/**
 * A row of unlit step keys — the empty-state signature. One key sits lit as an
 * invitation to load something.
 */
export function DeadKeys({ count = 16 }: { count?: number }) {
  const lit = Math.floor(count / 2);
  return (
    <div className="mx-auto flex max-w-60 justify-center gap-0.75" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-7 w-2.5 rounded-[1px]"
          style={
            i === lit
              ? { background: "var(--ramp-2)", boxShadow: "var(--led-shadow)" }
              : {
                  background: "#242422",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,.5)",
                }
          }
        />
      ))}
    </div>
  );
}

/** A segmented LED numeric readout (tempo-display style). */
export function LedReadout({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "crit";
  className?: string;
}) {
  const color =
    tone === "crit"
      ? "var(--ramp-1)"
      : tone === "warn"
        ? "var(--ramp-2)"
        : "#e8e6df";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] bg-[#0b0b0c] px-2 py-1 font-mono text-lg font-medium tabular-nums",
        className
      )}
      style={{
        color,
        textShadow: tone === "neutral" ? "none" : "var(--led-shadow)",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

/** Small silkscreen legend, as printed above a control on a hardware panel. */
export function SilkLabel({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "label" | "h1" | "h2" | "h3";
}) {
  return <Tag className={cn("silkscreen", className)}>{children}</Tag>;
}

/**
 * A drawn control motif for a category faceplate — the physical control that
 * section of gear is known by. Rack-unit scale, three kinds cycled by index.
 */
export function PanelMotif({ index, className }: { index: number; className?: string }) {
  const kind = index % 3;
  const stroke = "#6f6e64";

  if (kind === 0) {
    // rotary-encoder cluster with detent ticks
    return (
      <svg viewBox="0 0 132 44" className={cn("h-11 w-32", className)} aria-hidden>
        {[26, 66, 106].map((cx, i) => (
          <g key={cx}>
            {Array.from({ length: 11 }).map((_, t) => {
              const a = (-125 + t * 25) * (Math.PI / 180);
              return (
                <line
                  key={t}
                  x1={cx + Math.cos(a) * 15}
                  y1={22 + Math.sin(a) * 15}
                  x2={cx + Math.cos(a) * 17}
                  y2={22 + Math.sin(a) * 17}
                  stroke={stroke}
                  strokeWidth="1"
                />
              );
            })}
            <circle cx={cx} cy="22" r="13" fill="#232325" stroke={stroke} strokeWidth="1.75" />
            <line
              x1={cx}
              y1="22"
              x2={cx + Math.cos((-60 + i * 55) * (Math.PI / 180)) * 10}
              y2={22 + Math.sin((-60 + i * 55) * (Math.PI / 180)) * 10}
              stroke="#e6e4dc"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    );
  }

  if (kind === 1) {
    // VU-style LED ladder mid-signal
    return (
      <svg viewBox="0 0 132 44" className={cn("h-11 w-32", className)} aria-hidden>
        <rect x="0.5" y="0.5" width="131" height="43" fill="#141416" stroke={stroke} strokeWidth="1" rx="2" />
        {Array.from({ length: 14 }).map((_, i) => {
          const lit = i < 8;
          const col = i < 6 ? "var(--ramp-4)" : i < 10 ? "var(--ramp-3)" : "var(--ramp-1)";
          return (
            <rect
              key={i}
              x={7 + i * 8.6}
              y={9}
              width="5"
              height="26"
              rx="1"
              fill={lit ? col : "#2b2b28"}
              opacity={lit ? 0.9 : 1}
              style={lit ? { filter: "drop-shadow(0 0 1.5px currentColor)" } : undefined}
            />
          );
        })}
      </svg>
    );
  }

  // patch / jack field
  return (
    <svg viewBox="0 0 132 44" className={cn("h-11 w-32", className)} aria-hidden>
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4].map((c) => {
          const cx = 16 + c * 25;
          const cy = 13 + row * 18;
          return (
            <g key={`${row}-${c}`}>
              <circle cx={cx} cy={cy} r="6.5" fill="#0e0e0f" stroke={stroke} strokeWidth="1.25" />
              <circle cx={cx} cy={cy} r="2" fill="#3a3a35" />
            </g>
          );
        })
      )}
    </svg>
  );
}
