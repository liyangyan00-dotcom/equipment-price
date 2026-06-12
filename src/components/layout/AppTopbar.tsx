import { Bell, ChevronDown, Search, ShieldCheck } from "lucide-react";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-borderSoft bg-white/88 px-5 shadow-topbar backdrop-blur-xl">
      <div className="flex h-8 w-full max-w-[300px] items-center gap-2.5 rounded-[10px] border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-textMuted">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-[13px]">搜索设备、材料、供应商或 AI 任务</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden h-8 items-center gap-2 rounded-pill border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai md:flex">
          <ShieldCheck className="size-4" aria-hidden="true" />
          AI人工复核模式
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-pill border border-borderSoft bg-white text-textMuted transition hover:border-primary hover:text-primary"
          aria-label="通知"
        >
          <Bell className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex h-8 items-center gap-2.5 rounded-pill border border-borderSoft bg-white px-2.5 pl-3 text-left transition hover:border-primary"
          aria-label="用户菜单"
        >
          <span className="hidden text-[13px] font-medium text-textMain sm:inline">商务测算组</span>
          <span className="flex size-6 items-center justify-center rounded-pill bg-primary text-[11px] font-semibold text-white">
            AI
          </span>
          <ChevronDown className="size-3.5 text-textMuted" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
