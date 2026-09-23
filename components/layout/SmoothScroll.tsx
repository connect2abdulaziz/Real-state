"use client";

import { useEffect, useState } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Keeps GSAP ScrollTrigger in sync with Lenis.
 * Ticker integration makes pin/scrub feel smooth with smooth-scroll.
 */
function LenisScrollTriggerSync() {
  const lenis = useLenis();

  useEffect(() => {
    registerGsap();
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(ticker);
    };
  }, [lenis]);

  return null;
}

/**
 * Smooth scroll shell.
 * Lenis stays off when the user prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!prefersReducedMotion());
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.14,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false,
      }}
    >
      <LenisScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
