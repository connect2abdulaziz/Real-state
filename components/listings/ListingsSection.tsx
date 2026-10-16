"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { SiteContent } from "@/data/content";
import { useSiteContent } from "@/data/content/useSiteContent";
import { ListingsLightbox } from "@/components/listings/ListingsLightbox";

/** Desktop frame sizes */
const CENTER = { w: 300, h: 430 };
const SIDE = { w: 210, h: 250 };
/** Mobile — shorter so card + arrows fit one viewport */
const CENTER_M = { w: 250, h: 340 };
const SIDE_M = { w: 160, h: 200 };
const GAP = 18;
const GAP_M = 14;

/**
 * Slot layout (left → right):
 *   [side] [TALL] [side] [side] [side]
 */
const SLOTS = [
  { offset: -1, size: "side" as const },
  { offset: 0, size: "center" as const },
  { offset: 1, size: "side" as const },
  { offset: 2, size: "side" as const },
  { offset: 3, size: "side" as const },
];

/** Desktop carousel row width — description + nav share this width */
const DESKTOP_TRACK_W =
  SIDE.w * (SLOTS.length - 1) + CENTER.w + GAP * (SLOTS.length - 1);

type ListingItem = SiteContent["listings"]["items"][number];

/** Instant swap — no lingering old photo (avoids same image across slots). */
function SlotMedia({ item }: { item: ListingItem }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)]">
      <Image
        key={item.id}
        src={item.image}
        alt={item.title}
        fill
        quality={90}
        sizes="(max-width: 768px) 560px, 640px"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0a08]/55 via-transparent to-transparent" />
    </div>
  );
}

function SlotCaption({ item }: { item: ListingItem }) {
  return (
    <div className="relative mt-2.5 min-h-[2rem]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[11px] tracking-tight text-foreground md:text-xs">
          {item.title}
        </h3>
        <span className="shrink-0 text-[9px] tracking-wide text-foreground-subtle md:text-[10px]">
          {item.meta}
        </span>
      </div>
    </div>
  );
}

function NavArrows({
  onPrev,
  onNext,
  className = "",
}: {
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous property"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-foreground transition-colors duration-200 hover:border-electric/40 hover:text-electric md:h-12 md:w-12"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next property"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-foreground transition-colors duration-200 hover:border-electric/40 hover:text-electric md:h-12 md:w-12"
      >
        ›
      </button>
    </div>
  );
}

/**
 * Listings — tall card is 2nd slot.
 * Mobile: compact card + arrows directly under it (one-screen UX).
 * Desktop: original sizes, arrows with description row.
 */
export function ListingsSection() {
  const listings = useSiteContent().listings;
  const items = listings.items;
  const n = items.length;
  const [active, setActive] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const at = (offset: number) => items[(active + offset + n * 10) % n];

  const globalIndex = (offset: number) => (active + offset + n * 10) % n;

  const openLightbox = (index: number) => {
    setActive(index);
    setLightboxIndex(index);
  };

  const prev = () => setActive((i) => (i - 1 + n) % n);
  const next = () => setActive((i) => (i + 1) % n);

  const centerMidMobile = SIDE_M.w + GAP_M + CENTER_M.w / 2;
  const centerMidDesktop = SIDE.w + GAP + CENTER.w / 2;

  return (
    <section
      id="listings"
      data-section="listings"
      className="relative z-20 overflow-hidden py-10 md:py-16 lg:py-20"
      aria-labelledby="listings-title"
      style={{
        background:
          "linear-gradient(165deg, #0a0806 0%, #12100c 38%, #0c0a08 72%, #080706 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 20% 30%, rgba(215,168,102,0.14) 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 85% 70%, rgba(215,168,102,0.10) 0%, transparent 60%), radial-gradient(ellipse 40% 35% at 50% 100%, rgba(184,140,70,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="page-container relative z-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-6">
          <p className="flex shrink-0 items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
            <span className="text-electric">{listings.index}</span>
            <span className="h-px w-8 bg-electric-soft/50" aria-hidden="true" />
            <span className="text-foreground-subtle">{listings.eyebrow}</span>
          </p>

          <h2
            id="listings-title"
            className="max-w-xl text-left text-[clamp(1.25rem,4.2vw,1.85rem)] font-light leading-[1.3] tracking-[-0.02em] text-foreground md:text-right md:text-[clamp(1.15rem,2.2vw,1.85rem)]"
          >
            {listings.title}
          </h2>
        </div>
      </div>

      <div className="relative z-10 mt-5 overflow-x-hidden md:mt-7">
        <div
          className="flex w-max items-end gap-3.5 max-md:[transform:translate3d(calc(50vw-var(--listings-center-mid-m)),0,0)] md:mx-auto md:w-full md:max-w-[var(--container-max)] md:transform-none md:gap-[18px] md:px-[var(--page-padding)]"
          style={
            {
              ["--listings-center-mid-m"]: `${centerMidMobile}px`,
              ["--listings-center-mid"]: `${centerMidDesktop}px`,
            } as CSSProperties
          }
        >
          {SLOTS.map((slot) => {
            const item = at(slot.offset);
            const isCenter = slot.size === "center";

            return (
              <article
                key={slot.offset}
                className={
                  isCenter
                    ? "w-[250px] shrink-0 md:w-[300px]"
                    : "w-[160px] shrink-0 md:w-[210px]"
                }
                aria-current={isCenter ? "true" : undefined}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(globalIndex(slot.offset))}
                  className={
                    isCenter
                      ? "group relative block h-[340px] w-[250px] cursor-zoom-in overflow-hidden rounded-2xl md:h-[430px] md:w-[300px]"
                      : "group relative block h-[200px] w-[160px] cursor-zoom-in overflow-hidden rounded-2xl md:h-[250px] md:w-[210px]"
                  }
                  aria-label={`View ${item.title}, ${item.meta}`}
                >
                  <SlotMedia item={item} />
                  <span className="pointer-events-none absolute inset-0 ring-0 ring-white/0 transition-[box-shadow] duration-200 group-hover:ring-2 group-hover:ring-white/20 group-focus-visible:ring-2 group-focus-visible:ring-electric/50" />
                </button>
                <SlotCaption item={item} />
              </article>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-5 flex justify-center md:hidden">
        <NavArrows onPrev={prev} onNext={next} />
      </div>

      <div className="page-container relative z-10 mt-6 md:mt-8">
        <div
          className="flex items-end justify-between gap-6 md:max-w-[var(--listings-track-w)]"
          style={
            { ["--listings-track-w"]: `${DESKTOP_TRACK_W}px` } as CSSProperties
          }
        >
          <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
            {listings.description}
          </p>

          <NavArrows onPrev={prev} onNext={next} className="hidden md:flex" />
        </div>
      </div>

      {lightboxIndex !== null ? (
        <ListingsLightbox
          items={[...items]}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(i) => {
            setLightboxIndex(i);
            setActive(i);
          }}
        />
      ) : null}
    </section>
  );
}
