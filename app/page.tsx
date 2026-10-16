import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { MarketingLocaleProvider } from "@/components/layout/MarketingLocaleProvider";
import { Hero } from "@/components/hero/Hero";
import { Experience } from "@/components/experience/Experience";
import { Process } from "@/components/process/Process";
import { ReportSection } from "@/components/report/ReportSection";
import { ListingsSection } from "@/components/listings/ListingsSection";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { FAQ } from "@/components/faq/FAQ";
import { ContactSection } from "@/components/contact/ContactSection";
import { getMarketingLocale } from "@/data/content/getMarketingLocale";

/**
 * Marketing landing — EN/FR via cookie + MarketingLocaleProvider.
 * Advisor section temporarily hidden.
 */
export default function Home() {
  const initialLocale = getMarketingLocale();

  return (
    <MarketingLocaleProvider initialLocale={initialLocale}>
      <SmoothScroll>
        <main>
          <Hero />
          <Experience />
          <Process />
          <ReportSection />
          <ListingsSection />
          <TestimonialsSection />
          <FAQ />
          <ContactSection />
        </main>
      </SmoothScroll>
    </MarketingLocaleProvider>
  );
}
