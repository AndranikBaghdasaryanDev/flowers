"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Expand } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ImageFallback } from "@/components/store/image-fallback";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";
import type { ImageDTO } from "@/lib/types";

/** Product image gallery: thumbnails, swipe on touch, hover zoom on desktop, full-screen lightbox. */
export function ProductGallery({ images, name }: { images: ImageDTO[]; name: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem]">
        <ImageFallback label={name} />
      </div>
    );
  }

  const goTo = (i: number) => {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 lg:w-20 lg:flex-col" aria-label={t("product.images")}>
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("product.showImageOf", { n: i + 1, total: images.length })}
                aria-current={i === active}
                className={cn(
                  "relative block h-20 w-16 overflow-hidden rounded-xl bg-cream ring-offset-2 ring-offset-ivory transition-all lg:h-24 lg:w-20",
                  i === active ? "ring-2 ring-brand" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem] [scrollbar-width:none] lg:overflow-hidden [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-cream lg:cursor-zoom-in"
              onMouseMove={(e) => {
                if (window.matchMedia("(hover: none)").matches) return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onMouseLeave={() => setZoom(null)}
              onClick={() => setLightbox(true)}
            >
              {failed.has(i) ? (
                <ImageFallback label={name} />
              ) : (
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  quality={80}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  onError={() => setFailed((s) => new Set(s).add(i))}
                  className="object-cover transition-transform duration-300 ease-out"
                  style={zoom && i === active ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                />
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-ivory/90 text-ink shadow-sm backdrop-blur hover:text-brand"
          aria-label={t("product.viewFullSize")}
        >
          <Expand className="h-[18px] w-[18px]" />
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden" aria-hidden="true">
            {images.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-ivory transition-all", i === active ? "w-5" : "w-1.5 opacity-60")} />
            ))}
          </div>
        )}
      </div>

      <Modal open={lightbox} onClose={() => setLightbox(false)} title={name} size="xl">
        <div className="relative mx-auto aspect-[4/5] max-h-[72dvh] w-auto overflow-hidden rounded-2xl bg-cream">
          <Image src={images[active].src} alt={images[active].alt} fill sizes="90vw" quality={80} className="object-contain" />
        </div>
        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                onClick={() => setActive(i)}
                className={cn("relative h-16 w-12 overflow-hidden rounded-lg", i === active ? "ring-2 ring-brand" : "opacity-60")}
                aria-label={t("product.showImage", { n: i + 1 })}
              >
                <Image src={img.src} alt="" fill sizes="48px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
