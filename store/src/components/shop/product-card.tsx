import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/format";
import { Rivets, StockMeter } from "@/components/shop/rack";

type ProductCardProps = {
  slug: string;
  name: string;
  categoryName: string;
  basePriceCents: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  totalStock?: number;
  variantNames?: string[];
  image?: string;
};

/**
 * A product as a faceplate on the rack: one full-width panel row. Recessed
 * monochrome thumbnail, silkscreen identity with its configs ruled inline, and
 * a channel-strip readout — stock meter and price — on the right.
 */
export function ProductCard({
  slug,
  name,
  categoryName,
  basePriceCents,
  priceMinCents,
  priceMaxCents,
  totalStock,
  variantNames,
  image,
}: ProductCardProps) {
  const lo = priceMinCents ?? basePriceCents;
  const hi = priceMaxCents ?? basePriceCents;
  const priceLabel = lo === hi ? formatCents(lo) : `From ${formatCents(lo)}`;
  const out = totalStock !== undefined && totalStock <= 0;
  const configs = variantNames && variantNames.length > 0 ? variantNames.join(" · ") : null;

  return (
    <Link
      href={`/products/${slug}`}
      className="panel group relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-3 transition-colors hover:border-border-strong focus-visible:border-accent sm:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <Rivets />

      <div className="panel-inset reg-marks relative aspect-square w-16 shrink-0 overflow-hidden sm:w-[4.5rem]">
        {image ? (
          <Image src={image} alt={name} fill sizes="72px" className="spec-photo object-cover" />
        ) : null}
        {out ? <span className="absolute inset-0 bg-panel-sunken/60" aria-hidden /> : null}
      </div>

      <div className="min-w-0">
        <h2 className="font-condensed text-lg font-semibold leading-tight text-foreground">
          {name}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
          <span className="uppercase">{categoryName}</span>
          {configs ? (
            <>
              <span className="text-border-strong" aria-hidden>
                |
              </span>
              <span>{configs}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="col-span-2 flex items-center gap-4 border-t border-border pt-2.5 sm:col-span-1 sm:flex-col sm:items-end sm:gap-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
        {totalStock !== undefined ? <StockMeter totalStock={totalStock} /> : null}
        <span className="ml-auto font-mono text-sm tabular-nums text-foreground sm:ml-0 sm:text-[15px]">
          {priceLabel}
        </span>
      </div>
    </Link>
  );
}
