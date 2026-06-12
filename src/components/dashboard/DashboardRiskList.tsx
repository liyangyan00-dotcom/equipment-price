import { AlertTriangle, ArrowRight } from "lucide-react";
import { RiskBadge } from "@/components/badges";
import { BaseCard, RiskCard } from "@/components/common";
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

type DashboardRiskListProps = {
  data: DashboardRiskAlert[];
};

export function DashboardRiskList({ data }: DashboardRiskListProps) {
  const [primaryRisk, ...restRisks] = data;

  return (
    <BaseCard contentClassName="space-y-3 p-4">
      <DashboardSectionHeader
        icon={AlertTriangle}
        title="AI 预警与智能建议"
        subtitle="风险类型、影响对象与建议动作"
        tone="orange"
        action={<span className="rounded-pill bg-warning-soft px-2.5 py-1 text-caption font-semibold text-warning">运营问题面板</span>}
      />

      {primaryRisk ? (
        <RiskCard
          title={primaryRisk.title}
          description={primaryRisk.target}
          riskLevel={primaryRisk.riskLevel}
          notes={[primaryRisk.suggestedAction]}
          className="shadow-none"
        />
      ) : null}

      <div className="space-y-2">
        {restRisks.map((risk) => (
          <div
            key={risk.id}
            className="grid gap-3 rounded-[12px] border border-borderSoft bg-[var(--color-bg-muted)] p-3 md:grid-cols-[1.1fr_1fr_auto] md:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-1 h-10 w-1 shrink-0 rounded-pill ${riskAccent[risk.riskLevel]}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-textMain">{risk.title}</p>
                  <span className="text-caption text-textMuted">{riskTypeLabel[risk.riskType]}</span>
                </div>
                <p className="mt-1 truncate text-caption text-textMuted">{risk.target}</p>
                <p className="mt-1 text-caption leading-5 text-textSecondary">{risk.suggestedAction}</p>
              </div>
            </div>
            <RiskBadge level={risk.riskLevel} className="w-fit" />
            <span className="inline-flex items-center justify-end gap-1 text-caption font-semibold text-primary">
              {risk.actionLabel}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}
