import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "ai" | "risk";
  density?: "default" | "compact";
};

export function BaseCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  variant = "default",
  density = "default",
}: BaseCardProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft bg-card shadow-card",
        variant === "ai" && "border-ai-border bg-gradient-to-br from-white to-ai-soft shadow-ai",
        variant === "risk" && "border-warning/30 border-l-4 border-l-warning",
        className
      )}
    >
      {(title || description || actions) && (
        <div className={cn("flex items-start justify-between gap-4 border-b border-borderSoft", density === "compact" ? "px-4 py-3" : "px-5 py-4")}>
          <div className="min-w-0">
            {title ? <h3 className={cn("text-textMain", density === "compact" ? "text-[15px] font-semibold leading-5" : "text-card-title")}>{title}</h3> : null}
            {description ? <p className={cn("text-caption text-textMuted", density === "compact" ? "mt-0.5" : "mt-1")}>{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={cn(density === "compact" ? "p-4" : "p-5", contentClassName)}>{children}</div>
    </section>
  );
}
