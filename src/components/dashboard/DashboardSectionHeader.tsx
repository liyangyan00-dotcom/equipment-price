import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleHeader } from "@/components/common";

type DashboardSectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: "blue" | "cyan" | "purple" | "orange" | "red" | "green";
  action?: ReactNode;
  className?: string;
};

export function DashboardSectionHeader({
  icon: Icon,
  title,
  subtitle,
  tone = "blue",
  action,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <ModuleHeader icon={Icon} title={title} subtitle={subtitle} tone={tone} action={action} className={className} />
  );
}
