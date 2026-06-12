import { AlertTriangle, ArrowRight, BrainCircuit } from "lucide-react";
import { AiBadge, RiskBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
import type { DashboardRiskAlert } from "@/data/mock/dashboard";
import type { RiskLevel } from "@/types/common";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const riskTypeLabel = {
  expired_price: "过期价格",
  low_price_outlier: "低价异常",
  missing_parameters: "参数缺失",
  slow_supplier_response: "供应商响应慢",
  volatile_price: "价格波动过大",
  priority_supplier: "优先供应商",
};

const riskAccent: Record<RiskLevel, string> = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-[#C2410C]",
  critical: "bg-danger",
};

const compactRiskCounts = [32, 18, 12, 26];

type RiskDecisionPanelProps = {
  data: DashboardRiskAlert[];
  hideAiSuggestions?: boolean;
};

export function RiskDecisionPanel({ data, hideAiSuggestions = false }: RiskDecisionPanelProps) {
  if (hideAiSuggestions) {
    return (
      <BaseCard contentClassName="space-y-2.5 p-3">
        <DashboardSectionHeader
          icon={AlertTriangle}
          title="风险决策工作区"
          subtitle="AI预警与智能建议"
          tone="orange"
          action={<AiBadge label="AI建议" icon="analysis" />}
        />

        <div className="space-y-2">
          {data.slice(0, 4).map((risk, index) => (
            <div key={risk.id} className="flex items-center gap-2 rounded-[11px] border border-borderSoft bg-[var(--color-bg-muted)] px-2.5 py-2">
              <span className={`size-2.5 shrink-0 rounded-full ${riskAccent[risk.riskLevel]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-textMain">{risk.title}</p>
                <p className="truncate text-[10.5px] text-textMuted">{risk.recommendedOperation}</p>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-danger">{compactRiskCounts[index]}</span>
              <span className="shrink-0 text-[10.5px] font-semibold text-textMuted">条</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center border-t border-borderSoft pt-2">
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            查看更多预警与建议
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard contentClassName="space-y-2.5 p-3.5">
      <DashboardSectionHeader
        icon={AlertTriangle}
        title="风险决策工作区"
        subtitle="左侧识别运营问题，右侧给出 AI 建议动作，所有建议需人工确认"
        tone="orange"
        action={<AiBadge label="风险与建议联动" icon="analysis" />}
      />

      <section className="grid gap-3 xl:grid-cols-[7fr_5fr]">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-[12px] border border-warning/20 bg-warning-soft/55 px-3 py-2">
            <span className="text-[13px] font-semibold text-warning">风险预警列表</span>
            <span className="text-[12px] font-semibold text-warning">运营问题面板</span>
          </div>

          {data.map((risk) => (
            <div
              key={risk.id}
              className="grid gap-2.5 rounded-[12px] border border-borderSoft bg-[var(--color-bg-muted)] p-2.5 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-1 h-9 w-1 shrink-0 rounded-pill ${riskAccent[risk.riskLevel]}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-textMain">{risk.title}</p>
                    <span className="text-[11px] text-textMuted">{riskTypeLabel[risk.riskType]}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-textMuted">{risk.target}</p>
                </div>
              </div>
              <p className="line-clamp-2 text-[12px] leading-5 text-textSecondary">{risk.suggestedAction}</p>
              <div className="flex items-center justify-between gap-2 md:justify-end">
                <RiskBadge level={risk.riskLevel} />
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                  {risk.actionLabel}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-[14px] border border-ai-border bg-gradient-to-br from-white to-ai-soft/55 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-[10px] bg-ai-soft text-ai">
                <BrainCircuit className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-textMain">AI建议动作</p>
                <p className="text-[11px] text-textMuted">与风险逐条对应</p>
              </div>
            </div>
            <AiBadge label="AI建议" icon="analysis" />
          </div>

          {data.slice(0, 4).map((risk) => (
            <div key={risk.id} className="rounded-[12px] border border-ai-border bg-white/78 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold text-ai">对应风险：{risk.title}</span>
                <RiskBadge level={risk.riskLevel} />
              </div>
              <p className="line-clamp-2 text-[12px] leading-5 text-textSecondary">AI建议：{risk.aiAdvice}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold text-textMain">推荐操作：{risk.recommendedOperation}</span>
                <span className="rounded-pill bg-ai px-2.5 py-1 text-[12px] font-semibold text-white">{risk.recommendedOperation}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </BaseCard>
  );
}
