"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { siteContent } from "@/data/content";

/** Previous larger frame sizes */
const CENTER = { w: 300, h: 430 };
const SIDE = { w: 210, h: 250 };
const GAP = 18;

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

type ListingItem = (typeof siteContent.listings.items)[number];

function SlotMedia({ item }: { item: ListingItem }) {
  const [current, setCurrent] = useState(item);
  const [incoming, setIncoming] = useState<ListingItem | null>(null);

  useEffect(() => {
    if (item.id === current.id) return;
    setIncoming(item);
  }, [item, current.id]);

  return (
    <div className="absolute inset-0">
      <Image
        src={current.image}
        alt={current.title}
        fill
        sizes="300px"
        className="object-cover"
      />
      {incoming ? (
        <Image
          key={incoming.id}
          src={incoming.image}
          alt={incoming.title}
          fill
          sizes="300px"
          className="object-cover listing-crossfade"
          onAnimationEnd={() => {
            setCurrent(incoming);
            setIncoming(null);
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0a08]/55 via-transparent to-transparent" />
    </div>
  );
}

function SlotCaption({ item }: { item: ListingItem }) {
  const [current, setCurrent] = useState(item);
  const [incoming, setIncoming] = useState<ListingItem | null>(null);

  useEffect(() => {
    if (item.id === current.id) return;
    setIncoming(item);
  }, [item, current.id]);

  return (
    <div className="relative mt-2.5 min-h-[2rem]">
      {/* Current caption stays visible — never drops to blank */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[11px] tracking-tight text-foreground md:text-xs">
          {current.title}
        </h3>
        <span className="shrink-0 text-[9px] tracking-wide text-foreground-subtle md:text-[10px]">
          {current.meta}
        </span>
      </div>

      {/* New caption fades in on top, then becomes current */}
      {incoming ? (
        <div
          className="absolute inset-0 flex items-baseline justify-between gap-2 listing-crossfade"
          style={{ background: "#0c0a08" }}
          onAnimationEnd={() => {
            setCurrent(incoming);
            setIncoming(null);
          }}
        >
          <h3 className="truncate text-[11px] tracking-tight text-foreground md:text-xs">
            {incoming.title}
          </h3>
          <span className="shrink-0 text-[9px] tracking-wide text-foreground-subtle md:text-[10px]">
            {incoming.meta}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Listings — large fixed frames; tall = 2nd slot; header on one row.
 */
export function ListingsSection() {
  const { listings } = siteContent;
  const items = listings.items;
  const n = items.length;
  const [active, setActive] = useState(1);

  const at = (offset: number) => items[(active + offset + n * 10) % n];

  const prev = () => setActive((i) => (i - 1 + n) % n);
  const next = () => setActive((i) => (i + 1) % n);

  return (
    <section
      id="listings"
      data-section="listings"
      className="relative z-20 overflow-hidden py-14 md:py-16 lg:py-20"
      aria-labelledby="listings-title"
      style={{
        /* Deep black × gold mix — distinct from the cooler report section */
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

      {/* Label + headline on the same line */}
      <div className="page-container relative z-10">
        <div className="flex flex-row items-baseline justify-between gap-6">
          <p className="flex shrink-0 items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
            <span className="text-electric">{listings.index}</span>
            <span className="h-px w-8 bg-electric-soft/50" aria-hidden="true" />
            <span className="text-foreground-subtle">{listings.eyebrow}</span>
          </p>

          <h2
            id="listings-title"
            className="max-w-xl text-right text-[clamp(1.15rem,2.2vw,1.85rem)] font-light leading-[1.3] tracking-[-0.02em] text-foreground"
          >
            {listings.title}
          </h2>
        </div>
      </div>

      <div className="page-container relative z-10 mt-6 md:mt-7">
        <div
          className="flex items-end justify-start overflow-hidden"
          style={{ gap: GAP }}
        >
          {SLOTS.map((slot) => {
            const item = at(slot.offset);
            const isCenter = slot.size === "center";
            const frame = isCenter ? CENTER : SIDE;

            return (
              <article
                key={slot.offset}
                className="shrink-0"
                style={{ width: frame.w }}
                aria-current={isCenter ? "true" : undefined}
              >
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{ width: frame.w, height: frame.h }}
                >
                  <SlotMedia item={item} />
                </div>
                <SlotCaption item={item} />
              </article>
            );
          })}
        </div>
      </div>

      <div className="page-container relative z-10 mt-8 flex items-end justify-between gap-6">
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          {listings.description}
        </p>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous property"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-foreground transition-colors duration-200 hover:border-electric/40 hover:text-electric"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next property"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-foreground transition-colors duration-200 hover:border-electric/40 hover:text-electric"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
