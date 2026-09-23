import { cn } from "@/lib/utils";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
};

/**
 * Base button — structure + tokens only. Visual polish later.
 */
export function Button({
  children,
  href,
  type = "button",
  variant = "primary",
  className,
  onClick,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center px-5 py-3 text-sm tracking-wide transition-opacity hover:opacity-80",
    variant === "primary" && "border border-white/20 text-foreground",
    variant === "ghost" && "text-foreground-muted",
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
