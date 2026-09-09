"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import {
  navigationGroups,
  navigationItems,
  type NavigationCounts,
} from "@/config/navigation";

import { cn } from "@/lib/utils";
import { SidebarNavItem, isNavigationItemActive } from "./SidebarNavItem";
import type { TopbarAiMode } from "@/types/topbar";

const sidebarPreferenceKey = "wpi:sidebar-collapsed";
const emptyCounts: NavigationCounts = {
  pendingPriceReviews: 0,
  pendingInquiryReviews: 0,
  projectPricingReviews: 0,
  projectPricingGaps: 0,
  projectPricingPending: 0,
};

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedState, setExpandedState] = useState({ routeKey: "", href: "" });
  const [counts, setCounts] = useState<NavigationCounts>(emptyCounts);
  const [aiMode, setAiMode] = useState<TopbarAiMode>("human_review");

  const activeExpandableHref = useMemo(
    () => navigationItems.find((item) => item.children?.length && isNavigationItemActive(pathname, searchParams, item))?.href ?? "",
    [pathname, searchParams],
  );
  const routeKey = `${pathname}?${searchKey}`;
  const expandedHref = expandedState.routeKey === routeKey ? expandedState.href : activeExpandableHref;

  useEffect(() => {
    const receive = (event: Event) => {
      const payload = (event as CustomEvent<{ counts?: NavigationCounts; aiMode?: TopbarAiMode }>).detail;
      if (!payload?.counts) return;
      setCounts(payload.counts);
      setAiMode(payload.aiMode ?? "human_review");
    };
    window.addEventListener("wpi:navigation-context", receive);
    return () => window.removeEventListener("wpi:navigation-context", receive);
  }, []);

  useEffect(() => {
    const restorePreference = window.setTimeout(() => {
      const saved = window.localStorage.getItem(sidebarPreferenceKey);
      setCollapsed(window.innerWidth < 1100 ? true : saved === "true");
    }, 0);
    const compactOnNarrowViewport = () => {
      if (window.innerWidth < 900) setCollapsed(true);
    };
    window.addEventListener("resize", compactOnNarrowViewport);
    return () => {
      window.clearTimeout(restorePreference);
      window.removeEventListener("resize", compactOnNarrowViewport);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-sidebar-width", collapsed ? "76px" : "256px");
  }, [collapsed]);


  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarPreferenceKey, String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-sidebar flex-col bg-gradient-to-b from-primary-deep to-primary-navy py-3 text-white shadow-sidebar transition-[width,padding] duration-200",
        collapsed ? "px-3" : "px-4",
      )}
      data-sidebar-collapsed={collapsed}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "flex-col justify-center gap-1" : "gap-3 px-1")}>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_20px_rgba(0,166,184,0.2)]">
          <Image src="/brand/shuiwu-zhicai.png" alt="水务智采 · AI 价格情报与成本决策平台" width={40} height={40} className="rounded-[12px]" priority />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1" title="水务智采 · AI 价格情报与成本决策平台">
            <p className="truncate text-[15px] font-semibold leading-5 text-white">水务智采</p>
            <p className="text-[11px] font-medium leading-[14px] text-cyan-100/90"><span className="block whitespace-nowrap">AI 价格情报与</span><span className="block whitespace-nowrap">成本决策平台</span></p>
          </div>
        ) : null}
        {!collapsed ? (
          <button type="button" onClick={toggleCollapsed} className="flex size-9 shrink-0 items-center justify-center rounded-md text-cyan-100/65 transition hover:bg-white/10 hover:text-white" aria-label="收起侧边栏" title="收起侧边栏">
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button type="button" onClick={toggleCollapsed} className="mx-auto mt-1 flex size-9 items-center justify-center rounded-md text-cyan-100/65 transition hover:bg-white/10 hover:text-white" aria-label="展开侧边栏" title="展开侧边栏">
          <PanelLeftOpen className="size-4" />
        </button>
      ) : null}

      <nav className={cn("sidebar-scrollbar flex flex-1 flex-col overflow-y-auto overflow-x-hidden pr-1", collapsed ? "mt-3 gap-3" : "mt-4 gap-5")} aria-label="主导航">
        {navigationGroups.map((group) => {
          const groupItems = navigationItems.filter((item) => item.group === group);
          const groupActive = groupItems.some((item) => isNavigationItemActive(pathname, searchParams, item));
          return (
            <div key={group} className="flex flex-col gap-2">
              {!collapsed ? (
                <div
                  className={cn(
                    "relative flex h-9 items-center bg-gradient-to-r from-white/[0.1] to-transparent px-3 text-[14px] font-extrabold leading-none text-cyan-50/95",
                    "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-cyan-100/45",
                    groupActive && "from-cyan/[0.16] text-white before:w-1 before:bg-cyan before:shadow-[0_0_10px_rgba(34,211,238,0.65)]",
                  )}
                >
                  {group}
                </div>
              ) : group !== navigationGroups[0] ? <div className="mx-2 border-t border-white/8" /> : null}
              <div className="flex flex-col gap-1">
                {groupItems.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    searchParams={searchParams}
                    collapsed={collapsed}
                    expanded={expandedHref === item.href}
                    counts={counts}
                    onToggle={() => setExpandedState({ routeKey, href: expandedHref === item.href ? "" : item.href })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <Link
        href="/settings/ai"
        title={collapsed ? (aiMode === "human_review" ? "AI 人工复核已启用" : "AI 辅助模式已启用") : undefined}
        className={cn(
          "mt-3 flex min-h-12 items-center rounded-lg border border-white/10 bg-white/[0.06] transition hover:bg-white/[0.1]",
          collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        )}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai/20 text-purple-200">
          <ShieldCheck className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-primary-deep bg-success" />
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold text-white">{aiMode === "human_review" ? "AI 人工复核已启用" : "AI 辅助模式已启用"}</span>
            <span className="mt-0.5 block truncate text-[9px] text-cyan-100/55">点击查看审核规则</span>
          </span>
        ) : null}
      </Link>
    </aside>
  );
}
