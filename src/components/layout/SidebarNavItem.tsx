"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { NavigationChildItem, NavigationCounts, NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type SearchReader = { get: (name: string) => string | null };

type SidebarNavItemProps = {
  item: NavigationItem;
  pathname: string;
  searchParams: SearchReader;
  collapsed: boolean;
  expanded: boolean;
  counts: NavigationCounts;
  onToggle: () => void;
};

export function isNavigationChildActive(pathname: string, searchParams: SearchReader, child: NavigationChildItem) {
  switch (child.match) {
    case "exact":
      return pathname === child.href;
    case "catalog-record": {
      if (pathname === "/equipment-catalog") return true;
      if (!pathname.startsWith("/equipment-catalog/")) return false;
      const segments = pathname.split("/").filter(Boolean);
      return segments.length === 2 && !["collection", "reviews"].includes(segments[1]);
    }
    case "catalog-collection":
      return pathname === child.href || pathname.startsWith(`${child.href}/tasks/`);
    case "project-pricing-projects":
      return pathname === "/project-pricing" && [null, "projects"].includes(searchParams.get("view"));
    case "project-pricing-workspace":
      if (pathname === "/project-pricing") return ["workspace", "review", "gaps"].includes(searchParams.get("view") ?? "");
      return pathname.startsWith("/project-pricing/");
    case "project-pricing-pending":
      return pathname === "/project-pricing" && ["review", "gaps"].includes(searchParams.get("view") ?? "");
    case "query-view":
      return pathname === "/project-pricing" && searchParams.get("view") === child.view;
    case "prefix":
    default:
      return pathname === child.href || pathname.startsWith(`${child.href}/`);
  }
}

export function isNavigationItemActive(pathname: string, searchParams: SearchReader, item: NavigationItem) {
  if (item.children?.some((child) => isNavigationChildActive(pathname, searchParams, child))) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function CountBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} 项待处理`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill bg-warning px-1.5 text-[9px] font-bold leading-4 text-primary-deep",
        compact && "absolute -right-1 -top-1 min-w-4",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function SidebarNavItem({ item, pathname, searchParams, collapsed, expanded, counts, onToggle }: SidebarNavItemProps) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = isNavigationItemActive(pathname, searchParams, item);
  const Icon = item.icon;
  const itemCount = item.badgeKey
    ? counts[item.badgeKey]
    : item.children?.reduce((total, child) => total + (child.badgeKey ? counts[child.badgeKey] : 0), 0) ?? 0;

  if (hasChildren) {
    return (
      <div className="min-w-0">
        <div
          className={cn(
            "group relative flex h-sidebar-item items-center rounded-lg text-[14px] font-medium text-[var(--sidebar-item-text)] transition",
            "hover:bg-[var(--sidebar-item-hover-bg)] hover:text-white",
            isActive && "bg-[var(--sidebar-item-active-bg)] text-white shadow-[0_8px_18px_rgba(0,166,184,0.18)] hover:bg-[var(--sidebar-item-active-bg)] hover:text-white",
            collapsed && "justify-center",
          )}
        >
          {isActive ? <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-pill bg-cyan shadow-[0_0_12px_rgba(0,166,184,0.65)]" /> : null}
          <Link
            href={item.href}
            title={collapsed ? item.title : undefined}
            aria-label={collapsed ? item.title : undefined}
            className={cn("relative flex min-w-0 flex-1 items-center gap-3 py-2 pl-4", collapsed && "flex-none justify-center px-0")}
          >
            <Icon data-icon="inline-start" className={cn("size-[18px] shrink-0 text-[var(--sidebar-item-muted)] transition group-hover:text-white", isActive && "text-white")} aria-hidden="true" />
            {collapsed ? <CountBadge count={itemCount} compact /> : <><span className="min-w-0 flex-1 truncate">{item.title}</span><CountBadge count={itemCount} /></>}
          </Link>
          {!collapsed ? (
            <button
              type="button"
              data-no-global-interaction
              aria-label={expanded ? `收起${item.title}子菜单` : `展开${item.title}子菜单`}
              aria-expanded={expanded}
              onClick={onToggle}
              className="mr-0.5 flex size-10 shrink-0 items-center justify-center rounded-md text-cyan-100/70 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
            </button>
          ) : null}
        </div>

        {expanded && !collapsed ? (
          <div className="relative ml-[21px] mt-1 space-y-0.5 border-l border-cyan-100/20 pb-1 pl-3">
            {item.childrenLabel ? <p className="px-2 pb-1 pt-1 text-[10px] font-semibold text-cyan-100/60">{item.childrenLabel}</p> : null}
            {item.children?.map((child) => {
              const childActive = isNavigationChildActive(pathname, searchParams, child);
              const childCount = child.badgeKey ? counts[child.badgeKey] : 0;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "group/child relative flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-cyan-50/72 transition",
                    "hover:bg-white/[0.08] hover:text-white",
                    childActive && "bg-white/[0.12] font-semibold text-white",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full bg-cyan-100/35", childActive && "bg-cyan shadow-[0_0_8px_rgba(0,166,184,0.72)]")} />
                  <span className="min-w-0 flex-1 truncate">{child.title}</span>
                  <CountBadge count={childCount} />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      aria-label={collapsed ? item.title : undefined}
      className={cn(
        "group relative flex h-sidebar-item items-center gap-3 rounded-lg px-4 text-[14px] font-medium text-[var(--sidebar-item-text)] transition",
        "hover:bg-[var(--sidebar-item-hover-bg)] hover:text-white",
        isActive && "bg-[var(--sidebar-item-active-bg)] text-white shadow-[0_8px_18px_rgba(0,166,184,0.18)] hover:bg-[var(--sidebar-item-active-bg)] hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {isActive ? <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-pill bg-cyan shadow-[0_0_12px_rgba(0,166,184,0.65)]" /> : null}
      <Icon data-icon="inline-start" className={cn("size-[18px] shrink-0 text-[var(--sidebar-item-muted)] transition group-hover:text-white", isActive && "text-white")} aria-hidden="true" />
      {!collapsed ? <><span className="min-w-0 flex-1 truncate">{item.title}</span><CountBadge count={itemCount} /></> : <CountBadge count={itemCount} compact />}
    </Link>
  );
}
