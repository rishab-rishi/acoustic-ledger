"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const shown = images.length > 0 ? images : undefined;

  return (
    <div>
      <div className="panel-inset reg-marks group relative aspect-square overflow-hidden">
        {shown ? (
          <Image
            src={shown[active]}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
            className="spec-photo object-cover"
          />
        ) : null}
      </div>
      {shown && shown.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {shown.map((img, i) => (
            <button
              key={img}
              type="button"
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "panel-inset relative size-16 overflow-hidden transition-colors",
                i === active ? "border-accent" : "hover:border-border-strong"
              )}
            >
              <Image
                src={img}
                alt=""
                fill
                className="spec-photo object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
