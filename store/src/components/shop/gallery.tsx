"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const shown = images.length > 0 ? images : undefined;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-border bg-card">
        {shown ? (
          <Image
            src={shown[active]}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="object-cover"
          />
        ) : null}
      </div>
      {shown && shown.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {shown.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 overflow-hidden border",
                i === active ? "border-foreground" : "border-border"
              )}
            >
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
