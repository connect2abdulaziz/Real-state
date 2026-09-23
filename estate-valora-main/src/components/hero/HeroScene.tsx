"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * HeroScene — entrance timeline + pin/reveal scroll transition.
 *
 * On scroll (after load animation):
 *   video stays pinned
 *   foreground (copy / stats / scroll / header) drifts up + fades
 *   dim overlay darkens the video
 *   Experience section rises over the pinned hero
 *   pin releases → normal scroll
 */
export function HeroScene({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLElement>(null);

  registerGsap();

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const reduced = prefersReducedMotion();

      // ── Entrance ──────────────────────────────────────────
      if (!reduced) {
        const intro = gsap.timeline({
          defaults: { ease: "power3.out" },
        });

        intro
          .fromTo(
            '[data-hero="header"]',
            { opacity: 0 },
            { opacity: 1, duration: 0.8 },
            0.3,
          )
          .fromTo(
            '[data-hero="logo"]',
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: 0.6 },
            0.45,
          )
          .fromTo(
            '[data-hero="nav-item"]',
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.09 },
            0.55,
          )
          .fromTo(
            '[data-hero="header-cta"]',
            { opacity: 0 },
            { opacity: 1, duration: 0.4 },
            0.7,
          )
          .fromTo(
            '[data-reveal="line-1"]',
            { yPercent: 105 },
            { yPercent: 0, duration: 0.85, ease: "power4.out" },
            0.9,
          )
          .fromTo(
            '[data-hero="description"]',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6 },
            1.2,
          )
          .fromTo(
            '[data-hero="cta"]',
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.55 },
            1.4,
          )
          .fromTo(
            '[data-hero="stat-card"]',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 },
            1.55,
          )
          .fromTo(
            '[data-hero="scroll-indicator"]',
            { opacity: 0 },
            { opacity: 1, duration: 0.7 },
            1.75,
          );
      }

      // ── Pin + reveal scrub ────────────────────────────────
      if (reduced) return;

      const foreground = root.querySelector('[data-hero="foreground"]');
      const dim = root.querySelector('[data-hero="dim"]');
      const videoLayer = root.querySelector('[data-component="hero-video"]');

      const scrub = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          // Shorter pin = less scroll “effort” to finish the handoff
          end: "+=45%",
          pin: true,
          // true = 1:1 with scroll (no catch-up lag). Number = delayed smoothing.
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      if (foreground) {
        scrub.to(
          foreground,
          {
            y: -40,
            opacity: 0,
            ease: "none",
          },
          0,
        );
      }

      if (dim) {
        scrub.to(
          dim,
          {
            opacity: 0.5,
            ease: "none",
          },
          0,
        );
      }

      if (videoLayer) {
        scrub.to(
          videoLayer,
          {
            scale: 1.02,
            transformOrigin: "center center",
            ease: "none",
          },
          0,
        );
      }

      // Experience may mount after; refresh once layout settles
      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    { scope: containerRef, dependencies: [] },
  );

  return (
    <section
      ref={containerRef}
      id="hero"
      data-section="hero"
      className="relative min-h-svh w-full overflow-hidden"
      aria-label="Hero"
    >
      {children}
    </section>
  );
}
