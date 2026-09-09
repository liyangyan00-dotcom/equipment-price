import { ArrowRight, FilePenLine, RefreshCw, WandSparkles } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { WorkflowCard } from "./WorkflowPanels";
import type { InquiryLetterDraft, InquiryLetterItem } from "@/data/mock/aiInquiryLetters";

type AiInquiryLetterDraftProps = {
  draft: InquiryLetterDraft;
  items: InquiryLetterItem[];
};

export function AiInquiryLetterDraft({ draft, items }: AiInquiryLetterDraftProps) {
  return (
    <WorkflowCard
      icon={FilePenLine}
      title="AI 生成询价函"
      subtitle="AI 生成草稿，必须人工确认后才能发送"
      tone="purple"
      action={
        <>
          <AiBadge label="草稿预览" />
          <StatusBadge status={draft.status} />
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.78fr)]">
        <div className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft/70 via-white to-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ai-border/70 pb-3">
            <div>
              <h3 className="text-[17px] font-bold text-textMain">{draft.title}</h3>
              <p className="mt-1 text-[12px] text-textMuted">收件供应商：{draft.recipient}</p>
            </div>
            <ConfidenceBadge level={draft.confidence} />
          </div>
          <div className="mt-3 space-y-3 text-[13px] leading-6 text-textSecondary">
            <p>
              <span className="font-semibold text-textMain">项目名称：</span>
              {draft.projectName}
            </p>
            {draft.sections.map((section) => (
              <div key={section.title}>
                <div className="font-semibold text-ai">{section.title}</div>
                <p>{section.content}</p>
              </div>
            ))}
            <p>
              请于 <span className="font-semibold text-textMain">{draft.deadline}</span> 前回复报价；联系人：
              <span className="font-semibold text-textMain">{draft.contact}</span>。
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ai px-3 text-[12px] font-semibold text-white shadow-ai" type="button">
              <WandSparkles className="size-3.5" aria-hidden="true" />
              重新生成
            </button>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ai-border bg-white px-3 text-[12px] font-semibold text-ai" type="button">
              <FilePenLine className="size-3.5" aria-hidden="true" />
              手动编辑
            </button>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary" type="button">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              切换模板
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-borderSoft">
          <div className="border-b border-borderSoft bg-[var(--color-bg-muted)] px-3 py-2 text-[12px] font-semibold text-textSecondary">
            询价对象清单
          </div>
          <table className="w-full text-[12px]">
            <thead className="bg-white text-textMuted">
              <tr className="h-8 border-b border-borderSoft">
                <th className="px-2 text-left">名称 / 规格</th>
                <th className="px-2 text-center">单位</th>
                <th className="px-2 text-right">数量</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="h-10 border-b border-borderSoft last:border-0">
                  <td className="px-2">
                    <div className="font-semibold text-textMain">{item.name}</div>
                    <div className="text-[11px] text-textMuted">{item.specification}</div>
                  </td>
                  <td className="px-2 text-center text-textSecondary">{item.unit}</td>
                  <td className="px-2 text-right font-semibold tabular-nums text-textMain">{item.quantity.toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="flex h-9 w-full items-center justify-center gap-1 border-t border-borderSoft text-[12px] font-semibold text-primary" type="button">
            查看完整清单
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </WorkflowCard>
  );
}
