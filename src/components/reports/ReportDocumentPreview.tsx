import { FileText } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

type ReportSection = {
  title: string;
  body: string;
};

export function ReportDocumentPreview({ sections }: { sections: ReportSection[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={FileText} title="报告正文预览" subtitle="预览内容由 AI 生成，最终报告以人工确认结果为准" tone="purple" density="compact" />
      <article className="mt-3 rounded-[16px] border border-borderSoft bg-white px-8 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
        <h1 className="text-center text-[22px] font-bold text-textMain">江北水厂提标改造项目成本分析报告</h1>
        <p className="mt-2 text-center text-[12px] text-textMuted">AI报告中心生成 · 2026-06-15 · 版本 v1.4</p>
        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[16px] font-bold text-textMain">{section.title}</h2>
              <p className="mt-2 text-[13px] leading-7 text-textSecondary">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
