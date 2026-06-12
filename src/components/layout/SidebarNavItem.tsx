"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type SidebarNavItemProps = {
  item: NavigationItem;
};

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-sidebar-item items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-[var(--sidebar-item-text)] transition",
        "hover:bg-[var(--sidebar-item-hover-bg)] hover:text-white",
        isActive &&
          "bg-[var(--sidebar-item-active-bg)] text-white shadow-[0_10px_24px_rgba(0,166,184,0.22)] hover:bg-[var(--sidebar-item-active-bg)] hover:text-white"
      )}
    >
      {isActive ? (
        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-pill bg-cyan shadow-[0_0_14px_rgba(0,166,184,0.72)]" />
      ) : null}
      <Icon
        data-icon="inline-start"
        className={cn(
          "size-[18px] shrink-0 text-[var(--sidebar-item-muted)] transition group-hover:text-white",
          isActive && "text-white group-hover:text-white"
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
