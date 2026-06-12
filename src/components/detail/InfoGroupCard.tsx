import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleHeader } from "@/components/common";

type InfoGroupCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: "blue" | "cyan" | "purple" | "orange" | "green" | "slate";
  items: { label: string; value: ReactNode }[];
  action?: ReactNode;
};

export function InfoGroupCard({ icon, title, subtitle, tone = "blue", items, action }: InfoGroupCardProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={icon} title={title} subtitle={subtitle} tone={tone} density="compact" action={action} />
      </div>
      <div className="grid gap-x-4 gap-y-3 p-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[11px] font-semibold text-textMuted">{item.label}</p>
            <div className="mt-1 min-w-0 text-[13px] font-semibold text-textMain">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
