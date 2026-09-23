"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Extra delay in seconds */
  delay?: number;
  /** Rise distance in px */
  y?: number;
};

/**
 * Soft fade-up on scroll — once per element.
 * Section-level use only; skip hero / process / listings.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 22,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  registerGsap();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      gsap.set(el, { opacity: 0, y });

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
