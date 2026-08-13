import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/format";

type ProductCardProps = {
  slug: string;
  name: string;
  categoryName: string;
  basePriceCents: number;
  image?: string;
};

export function ProductCard({
  slug,
  name,
  categoryName,
  basePriceCents,
  image,
}: ProductCardProps) {
  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden border border-border bg-card">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {categoryName}
          </p>
          <h3 className="text-sm font-medium">{name}</h3>
        </div>
        <p className="shrink-0 font-mono text-sm tabular-nums">
          {formatCents(basePriceCents)}
        </p>
      </div>
    </Link>
  );
}
