import { Hero } from "@/components/hero/Hero";
import { Experience } from "@/components/experience/Experience";
import { Process } from "@/components/process/Process";
import { ReportSection } from "@/components/report/ReportSection";
import { ListingsSection } from "@/components/listings/ListingsSection";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { FAQ } from "@/components/faq/FAQ";
import { ContactSection } from "@/components/contact/ContactSection";

/**
 * Landing page composition.
 * Advisor section temporarily hidden.
 */
export default function Home() {
  return (
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
  );
}
