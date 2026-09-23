"use client";

import { useRef, useEffect } from "react";
import { gsap, registerGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Animated scroll cue — sits beside hero stats at bottom-right.
 */
export function ScrollIndicator() {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !lineRef.current) return;

    registerGsap();

    const tl = gsap.timeline({ repeat: -1, delay: 2.4 });

    tl.fromTo(
      lineRef.current,
      { scaleY: 0, transformOrigin: "top center", opacity: 1 },
      { scaleY: 1, duration: 1.1, ease: "power2.inOut" },
    ).to(lineRef.current, { opacity: 0, duration: 0.35, ease: "power1.in" });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      data-hero="scroll-indicator"
      className="flex flex-col items-center gap-3"
      aria-hidden="true"
    >
      <span
        className="text-[9px] tracking-[0.3em] uppercase text-foreground-subtle"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Scroll
      </span>

      <div className="relative h-14 w-px overflow-hidden bg-white/10">
        <div
          ref={lineRef}
          className="absolute inset-0 bg-foreground-subtle"
          style={{ transformOrigin: "top center", transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}
