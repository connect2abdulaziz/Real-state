import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Hero } from "@/components/hero/Hero";
import { Experience } from "@/components/experience/Experience";
import { Process } from "@/components/process/Process";
import { ReportSection } from "@/components/report/ReportSection";
import { ListingsSection } from "@/components/listings/ListingsSection";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { FAQ } from "@/components/faq/FAQ";
import { ContactSection } from "@/components/contact/ContactSection";

/**
 * Client landing page — kept as delivered.
 * Advisor section temporarily hidden (same as estate-valora-main).
 */
export default function Home() {
  return (
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
  );
}
