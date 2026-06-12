import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageToolbarProps = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageToolbar({ children, actions, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-borderSoft bg-card p-3 shadow-card xl:flex-row xl:items-center xl:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
