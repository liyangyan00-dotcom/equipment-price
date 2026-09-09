"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Radar,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WorkflowStep = {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  countKey: "pending" | "tasks" | "leads";
};

const steps: WorkflowStep[] = [
  { label: "价格采集", shortLabel: "采集", href: "/ai-price-collection", icon: Radar, countKey: "tasks" },
  { label: "报价文件审核", shortLabel: "报价审核", href: "/pending-quotes", icon: ClipboardCheck, countKey: "pending" },
  { label: "价格线索池", shortLabel: "线索", href: "/price-leads", icon: Rows3, countKey: "leads" },
];

const workflowPaths = steps.map((step) => step.href);

function countRows(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function AiPriceWorkflowNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState({ pending: 0, tasks: 0, leads: 0 });
  const inWorkflow = workflowPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!inWorkflow) return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/quote-recognition?limit=1", { cache: "no-store", signal: controller.signal }),
      fetch("/api/price-collection", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([quoteResponse, collectionResponse]) => {
      const quote = quoteResponse.ok ? await quoteResponse.json() as Record<string, unknown> : {};
      const collection = collectionResponse.ok ? await collectionResponse.json() as Record<string, unknown> : {};
      const quoteCounts = quote.counts && typeof quote.counts === "object"
        ? quote.counts as Record<string, unknown>
        : {};
      setCounts({
        pending: Number(quoteCounts.pendingItems || 0),
        tasks: countRows(collection.tasks),
        leads: countRows(collection.leads),
      });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
    });
    return () => controller.abort();
  }, [inWorkflow]);

  const context = useMemo(() => {
    const allowed = ["documentId", "itemId", "taskId", "leadId", "leadType", "leadName", "leadSpec", "currency", "source"];
    return Object.fromEntries(allowed.map((key) => [key, searchParams.get(key) || ""]));
  }, [searchParams]);

  if (!inWorkflow) return null;

  const activeIndex = Math.max(0, steps.findIndex((step) => pathname === step.href || pathname.startsWith(`${step.href}/`)));
  const contextLabel = context.leadId
    ? `价格线索 ${context.leadId}`
    : context.documentId
      ? `报价文件 ${context.documentId}`
      : "未锁定业务对象";

  return (
    <section className="mb-3 overflow-hidden rounded-[8px] border border-borderSoft bg-white shadow-card" aria-label="AI价格业务闭环">
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-[#F8FAFD] px-3 py-2">
        <div className="min-w-0">
          <strong className="text-[12px] text-textMain">AI 价格业务闭环</strong>
          <span className="ml-2 text-[10px] text-textMuted">在线采集进入线索池审核；上传报价进入文件审核</span>
        </div>
        <span className="max-w-[320px] truncate text-[10px] font-semibold text-primary" title={contextLabel}>{contextLabel}</span>
      </div>
      <div className="grid grid-cols-3">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const completed = index < activeIndex;
          const query = new URLSearchParams();
          if (index === 1 && context.documentId) query.set("documentId", context.documentId);
          if (index === 1 && context.itemId) query.set("itemId", context.itemId);
          if (index === 0 && context.taskId) query.set("taskId", context.taskId);
          if (index === 2 && context.leadId) query.set("leadId", context.leadId);
          const href = `${step.href}${query.size ? `?${query.toString()}` : ""}`;
          const count = counts[step.countKey];
          const Icon = step.icon;
          return (
            <Link
              key={step.href}
              href={href}
              className={cn(
                "group relative flex min-w-0 items-center gap-2 border-r border-borderSoft px-3 py-2.5 last:border-r-0",
                active ? "bg-primary-soft text-primary" : "text-textSecondary hover:bg-slate-50",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] border",
                active ? "border-primary/20 bg-white text-primary" : completed ? "border-success/20 bg-success/10 text-success" : "border-borderSoft bg-white text-textMuted",
              )}>
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold"><span className="mr-1 text-[10px] opacity-60">{index + 1}</span>{step.label}</span>
                <span className="block truncate text-[9px] text-textMuted">{count} 条业务记录</span>
              </span>
              {index < steps.length - 1 ? <ArrowRight className="absolute right-1 size-3 text-textMuted/45" /> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
