import { siteContent } from "@/data/content";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

/**
 * Advisor / broker section shell — design deferred.
 */
export function AdvisorSection() {
  const { eyebrow, name, title, description, cta } = siteContent.advisor;

  return (
    <section
      id="advisor"
      data-section="advisor"
      className="relative bg-surface py-24"
      aria-labelledby="advisor-title"
    >
      <div className="page-container">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h2 id="advisor-title" className="mt-4 text-3xl text-foreground">
          {name}
        </h2>
        <p className="mt-2 text-sm text-warm">{title}</p>
        <p className="mt-4 max-w-xl text-foreground-muted">{description}</p>
        <div className="mt-8">
          <Button href="#contact">{cta}</Button>
        </div>
      </div>
    </section>
  );
}
