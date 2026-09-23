import { cn } from "@/lib/utils";

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Small section eyebrow / label.
 */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-xs tracking-[0.2em] text-foreground-subtle uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}
