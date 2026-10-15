"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";
import type { SiteContent } from "@/data/content";

gsap.registerPlugin(useGSAP);

type ListingItem = SiteContent["listings"]["items"][number];

type ListingsLightboxProps = {
  items: ListingItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const SWIPE_THRESHOLD = 48;

/**
 * Full-screen listing gallery (ported from estate-valora).
 */
export function ListingsLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: ListingsLightboxProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  registerGsap();

  const n = items.length;
  const item = items[index];

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + n) % n);
  }, [index, n, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % n);
  }, [index, n, onIndexChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  useGSAP(
    () => {
      const shell = shellRef.current;
      const panel = panelRef.current;
      if (!shell || !panel) return;

      if (prefersReducedMotion()) {
        gsap.set(shell, { opacity: 1 });
        gsap.set(panel, { opacity: 1, scale: 1 });
        return;
      }

      gsap.fromTo(
        shell,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out" },
      );
      gsap.fromTo(
        panel,
        { opacity: 0, scale: 0.94, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" },
      );
    },
    { scope: shellRef },
  );

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (prefersReducedMotion()) {
      gsap.set(media, { opacity: 1 });
      return;
    }

    gsap.fromTo(
      media,
      { opacity: 0.35 },
      { opacity: 1, duration: 0.28, ease: "power2.out" },
    );
  }, [index]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (delta > SWIPE_THRESHOLD) goPrev();
    else if (delta < -SWIPE_THRESHOLD) goNext();
  };

  if (!mounted || !item) return null;

  return createPortal(
    <div
      ref={shellRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title}, ${item.meta}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#07090b]/92 backdrop-blur-sm"
        aria-label="Close gallery"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 flex w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-light text-foreground md:text-xl">
              {item.title}
            </p>
            <p className="text-sm text-foreground-muted">{item.meta}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-foreground transition-colors hover:border-white/40"
          >
            ×
          </button>
        </div>

        <div className="relative flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous property"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-lg text-foreground transition-colors hover:border-electric/40 md:flex"
          >
            ‹
          </button>

          <div
            ref={mediaRef}
            className="relative max-h-[78vh] min-h-[200px] w-full flex-1 overflow-hidden bg-[#07090b]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: "pan-y", aspectRatio: "1290 / 833" }}
          >
            <Image
              key={item.id}
              src={item.image}
              alt={item.title}
              fill
              quality={90}
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-contain"
              priority
            />
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next property"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-lg text-foreground transition-colors hover:border-electric/40 md:flex"
          >
            ›
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous property"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-lg"
          >
            ‹
          </button>
          <p className="text-xs tracking-wide text-foreground-subtle">
            Swipe or use arrows · {index + 1} / {n}
          </p>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next property"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-lg"
          >
            ›
          </button>
        </div>

        <p className="mt-2 hidden text-center text-xs text-foreground-subtle md:block">
          {index + 1} / {n}
        </p>
      </div>
    </div>,
    document.body,
  );
}
