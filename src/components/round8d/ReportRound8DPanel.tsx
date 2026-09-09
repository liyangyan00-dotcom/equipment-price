"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Download,
  FileText,
  Link2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { IconBox, MockExportDialog } from "@/components/common";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

const outlineSections = [
  {
    key: "summary",
    title: "报告摘要",
    body: "本报告汇总 12,568 条设备与地材价格数据，识别价格波动、供应商报价稳定性、附件证据完整度与潜在风险。",
  },
  {
    key: "price",
    title: "价格趋势",
    body: "近 6 个月泵类、阀门类与电气设备价格总体呈小幅上行，AI 建议对涨幅超过 15% 的条目进入人工复核。",
  },
  {
    key: "risk",
    title: "风险提示",
    body: "当前存在 12 条高于市场均值的价格、8 条证据不足记录，以及 2 家供应商报价一致性异常。",
  },
  {
    key: "evidence",
    title: "证据引用",
    body: "报告引用设备价格库、供应商库、询价记录与附件证据库共 8 个数据来源，可继续跳转查看证据链。",
  },
];

const versions = [
  { id: "v1.0", label: "v1.0 已审核", date: "2025-05-20 10:32" },
  { id: "v0.9", label: "v0.9 人工编辑", date: "2025-05-20 09:48" },
  { id: "v0.8", label: "v0.8 AI初稿", date: "2025-05-19 18:16" },
];

const qualityItems = [
  { label: "缺失数据", value: "3 项", tone: "orange" as const },
  { label: "风险提醒", value: "5 项", tone: "red" as const },
  { label: "建议修改", value: "3 条", tone: "blue" as const },
];

export function ReportRound8DPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useMockToast();
  const [active, setActive] = useState(searchParams.get("section") ?? "summary");
  const [version, setVersion] = useState("v1.0");
  const [exportOpen, setExportOpen] = useState(false);

  const section = useMemo(() => outlineSections.find((item) => item.key === active) ?? outlineSections[0], [active]);

  const selectSection = (key: string) => {
    setActive(key);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("section", key);
    router.replace(`?${params.toString()}`, { scroll: false });
    toast.info("报告章节已切换", "正文预览已按当前章节刷新。");
  };

  const selectVersion = (id: string) => {
    setVersion(id);
    toast.info("报告版本已切换", `当前正在预览 ${id} 的 mock 内容。`);
  };

  return (
    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white via-white to-ai-soft/60 p-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ai-border/70 pb-3">
        <div className="flex items-center gap-2">
          <IconBox icon={Sparkles} tone="purple" size="sm" />
          <div>
            <h2 className="text-[16px] font-black text-textMain">报告交互审阅</h2>
            <p className="text-[12px] text-textSecondary">章节、版本、证据与导出均为前端 mock 联动。</p>
          </div>
          <AiBadge label="AI审阅" className="h-6" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/ai-report-center")}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary"
          >
            <RotateCcw className="size-3.5" />
            返回报告中心
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-primary px-3 text-[12px] font-bold text-white shadow-primary"
          >
            <Download className="size-3.5" />
            模拟导出
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <div className="space-y-2">
          {outlineSections.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectSection(item.key)}
              className={cn(
                "flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left text-[12px] font-bold transition",
                active === item.key ? "border-primary bg-primary-soft text-primary" : "border-borderSoft bg-white text-textSecondary hover:border-primary/40"
              )}
            >
              {item.title}
              <span className="text-[11px] opacity-70">章节</span>
            </button>
          ))}
        </div>

        <div className="rounded-[14px] border border-borderSoft bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconBox icon={FileText} tone="blue" size="sm" />
              <div>
                <p className="text-[14px] font-black text-textMain">{section.title}</p>
                <p className="text-[11px] text-textMuted">当前版本：{version}</p>
              </div>
            </div>
            <StatusBadge status="completed" label="已生成" className="h-6" />
          </div>
          <p className="mt-4 rounded-[12px] border border-borderSoft bg-[#F8FAFD] p-3 text-[13px] leading-6 text-textSecondary">
            {section.body}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {qualityItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => toast.info(`${item.label}详情`, "已打开对应质量项的 mock 检查入口。")}
                className="rounded-[10px] border border-borderSoft bg-white px-3 py-2 text-left transition hover:border-ai/40 hover:bg-ai-soft"
              >
                <p className="text-[12px] font-semibold text-textMuted">{item.label}</p>
                <p className={cn("mt-1 text-[18px] font-black", item.tone === "red" ? "text-danger" : item.tone === "orange" ? "text-warning" : "text-primary")}>
                  {item.value}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[14px] border border-borderSoft bg-white p-3">
            <p className="text-[13px] font-black text-textMain">版本切换</p>
            <div className="mt-2 space-y-2">
              {versions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectVersion(item.id)}
                  className={cn(
                    "w-full rounded-[9px] border px-3 py-2 text-left text-[12px] transition",
                    version === item.id ? "border-ai bg-ai-soft text-ai" : "border-borderSoft bg-white text-textSecondary"
                  )}
                >
                  <span className="font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-75">{item.date}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-borderSoft bg-white p-3">
            <p className="text-[13px] font-black text-textMain">证据链入口</p>
            <div className="mt-2 grid gap-2">
              <button type="button" onClick={() => router.push("/attachments?relatedReport=REP-2025-0008")} className="inline-flex h-8 items-center justify-between rounded-[8px] border border-borderSoft px-3 text-[12px] font-semibold text-primary">
                <span className="inline-flex items-center gap-1.5"><Link2 className="size-3.5" />查看关联附件</span>
                8 份
              </button>
              <button type="button" onClick={() => router.push("/equipment-prices")} className="inline-flex h-8 items-center justify-between rounded-[8px] border border-borderSoft px-3 text-[12px] font-semibold text-primary">
                <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-3.5" />查看价格条目</span>
                12,568 条
              </button>
              <button type="button" onClick={() => router.push("/analytics?risk=high")} className="inline-flex h-8 items-center justify-between rounded-[8px] border border-borderSoft px-3 text-[12px] font-semibold text-danger">
                <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5" />查看风险分析</span>
                12 项
              </button>
            </div>
          </div>
        </div>
      </div>

      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success("导出任务已创建", `${format} 导出为 mock 任务，不生成真实文件。`);
        }}
      />
    </section>
  );
}
