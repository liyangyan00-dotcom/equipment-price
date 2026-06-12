"use client";

import Image from "next/image";
import { navigationGroups, navigationItems } from "@/config/navigation";
import sidebarPlantThumb from "../../../assets/backgrounds/sidebar_water_plant_thumb.png";
import logoMark from "../../../assets/svg-icons/logo_water_price_system.svg";
import { SidebarNavItem } from "./SidebarNavItem";

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-sidebar flex-col bg-gradient-to-b from-primary-deep to-primary-navy px-4 py-4 text-white shadow-sidebar">
      <div className="flex h-16 items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-[14px] bg-white shadow-[0_10px_28px_rgba(0,166,184,0.24)]">
          <Image src={logoMark} alt="水厂价格情报系统" width={32} height={32} priority />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 text-white">水厂价格中枢</p>
          <p className="truncate text-[12px] leading-4 text-cyan-100/70">AI Price Intelligence</p>
        </div>
      </div>

      <nav className="sidebar-scrollbar mt-5 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <p className="px-3 text-[11px] font-semibold tracking-[0.08em] text-cyan-100/45">
              {group}
            </p>
            <div className="flex flex-col gap-1">
              {navigationItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <SidebarNavItem key={item.href} item={item} />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 overflow-hidden rounded-card border border-white/10 bg-white/[0.06] shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        <div className="relative h-24">
          <Image
            src={sidebarPlantThumb}
            alt="水厂工程装饰图"
            fill
            sizes="224px"
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep via-primary-deep/45 to-transparent" />
        </div>
        <div className="p-4 pt-3">
          <p className="text-[12px] font-semibold text-white">AI 审核护栏</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">
            AI 结果仅作为建议，必须进入人工复核流程。
          </p>
        </div>
      </div>
    </aside>
  );
}
