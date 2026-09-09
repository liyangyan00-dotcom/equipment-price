import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { cn } from "@/lib/utils";

type SettingsSectionCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: "blue" | "cyan" | "purple" | "orange" | "red" | "green" | "slate";
  children: ReactNode;
  className?: string;
};

export function SettingsSectionCard({ icon, title, subtitle, tone = "blue", children, className }: SettingsSectionCardProps) {
  return (
    <section className={cn("rounded-card border border-borderSoft bg-card p-3.5 shadow-card", className)}>
      <ModuleHeader icon={icon} title={title} subtitle={subtitle} tone={tone} density="compact" />
      <div className="mt-3">{children}</div>
    </section>
  );
}
