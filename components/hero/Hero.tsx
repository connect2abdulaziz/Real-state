import { Header } from "@/components/layout/Header";
import { HeroVideo } from "@/components/hero/HeroVideo";
import { HeroContent } from "@/components/hero/HeroContent";
import { HeroStats } from "@/components/hero/HeroStats";
import { ScrollIndicator } from "@/components/hero/ScrollIndicator";
import { HeroScene } from "@/components/hero/HeroScene";

/**
 * Full-viewport hero.
 *
 * Bottom-left: copy + CTA
 * Bottom-right: glassy stats + scroll cue
 *
 * Scroll reveal (HeroScene):
 *   pin video → fade/lift UI → darken → Experience covers
 */
export function Hero() {
  return (
    <HeroScene>
      <HeroVideo />

      {/* Darkens during pin scrub — sits above video, below UI */}
      <div
        data-hero="dim"
        className="pointer-events-none absolute inset-0 z-[1] bg-background opacity-0"
        aria-hidden="true"
      />

      {/* All UI fades / lifts together on scroll */}
      <div data-hero="foreground" className="absolute inset-0 z-10">
        <Header />

        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="page-container pointer-events-auto pb-10 md:pb-14">
            <HeroContent />
          </div>
        </div>

        <div className="absolute bottom-8 right-5 flex items-end gap-5 md:bottom-10 md:right-12">
          <div className="hidden sm:block">
            <HeroStats />
          </div>
          <ScrollIndicator />
        </div>
      </div>
    </HeroScene>
  );
}
