"use client";

import { Suspense } from "react";
import { GitBranch, Sparkles } from "lucide-react";
import { useRouteContext } from "@/hooks/useRouteContext";

type RouteContextBannerProps = {
  title?: string;
  source?: string;
  summary?: string[];
};

function RouteContextBannerContent({ title = "已带入业务上下文", source, summary }: RouteContextBannerProps) {
  const context = useRouteContext();
  const displaySummary = summary ?? context.summary;
  const displaySource = source ?? context.source;

  if (!context.hasContext && displaySummary.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ai-border bg-gradient-to-r from-ai-soft via-white to-primary-soft/60 px-4 py-3 shadow-card">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-ai text-white shadow-ai">
          <GitBranch className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-textMain">{title}</div>
          <div className="truncate text-[12px] text-textSecondary">来源：{displaySource || "当前页面"}，已按实际加载结果完成去重与校验。</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {displaySummary.map((item) => (
          <span key={item} className="inline-flex h-7 items-center gap-1 rounded-pill border border-ai-border bg-white px-2.5 text-[12px] font-semibold text-ai">
            <Sparkles className="size-3.5" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RouteContextBanner(props: RouteContextBannerProps) {
  return (
    <Suspense fallback={null}>
      <RouteContextBannerContent {...props} />
    </Suspense>
  );
}
