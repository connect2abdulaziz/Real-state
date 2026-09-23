import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Surface container for interactive content only.
 * Use sparingly — avoid decorative card clutter.
 */
export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "border border-white/10 bg-surface/80 p-6 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
