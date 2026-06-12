import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox, type IconBoxTone } from "./IconBox";

type ModuleHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: IconBoxTone;
  action?: ReactNode;
  className?: string;
  density?: "default" | "compact";
  headingLevel?: 2 | 3;
};

export function ModuleHeader({
  icon,
  title,
  subtitle,
  tone = "blue",
  action,
  className,
  density = "default",
  headingLevel = 2,
}: ModuleHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className={cn("flex items-center justify-between gap-3", density === "compact" ? "min-h-9" : "min-h-10", className)}>
      <div className={cn("flex min-w-0 items-center", density === "compact" ? "gap-2.5" : "gap-3")}>
        <IconBox icon={icon} tone={tone} size={density === "compact" ? "sm" : "md"} />
        <div className="min-w-0">
          <Heading className={cn("truncate font-semibold text-textMain", density === "compact" ? "text-[14px] leading-5" : "text-[15px] leading-5")}>
            {title}
          </Heading>
          {subtitle ? (
            <p className={cn("mt-0.5 truncate text-textMuted", density === "compact" ? "text-[11px] leading-4" : "text-caption leading-4")}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
