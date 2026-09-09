import { ArrowRight, Eye, RefreshCw } from "lucide-react";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { TableActionGroup } from "@/components/common/TableActionGroup";
import { WorkflowCard } from "./WorkflowPanels";
import type { ParsedBoqRow } from "@/data/mock/boqParse";

type ParsedBoqTableProps = {
  rows: ParsedBoqRow[];
};

export function ParsedBoqTable({ rows }: ParsedBoqTableProps) {
  return (
    <WorkflowCard icon={RefreshCw} title="AI自动套价结果" subtitle={`共 ${rows.length} 条示例，展示 BOQ 识别、匹配与风险状态`} tone="blue">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-[12px]">
          <thead>
            <tr className="h-10 bg-[var(--color-bg-muted)] text-textSecondary">
              {["BOQ编号", "项目名称", "清单名称", "规格型号", "数量", "单位", "AI识别类别", "匹配价格", "匹配来源", "可信度", "缺口状态", "风险", "操作"].map((header) => (
                <th key={header} className="border-b border-borderSoft px-3 text-left font-semibold last:text-right">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.boqCode} className="h-[42px] border-b border-borderSoft hover:bg-primary-soft/30">
                <td className="px-3 font-medium text-primary">{row.boqCode}</td>
                <td className="px-3 text-textSecondary">{row.projectName}</td>
                <td className="px-3 font-semibold text-textMain">{row.itemName}</td>
                <td className="px-3 text-textSecondary">{row.specification}</td>
                <td className="px-3 text-right font-semibold text-textMain">{row.quantity.toLocaleString("zh-CN")}</td>
                <td className="px-3 text-textSecondary">{row.unit}</td>
                <td className="px-3 text-textSecondary">{row.aiCategory}</td>
                <td className="px-3 text-right font-semibold text-textMain">{row.matchedPrice ? `$${row.matchedPrice.toLocaleString("en-US")}` : "-"}</td>
                <td className="px-3 text-textSecondary">{row.source}</td>
                <td className="px-3"><ConfidenceBadge level={row.confidence} className="h-5 text-[11px]" /></td>
                <td className="px-3"><StatusBadge status={row.gapStatus} className="h-5 text-[11px]" /></td>
                <td className="px-3"><RiskBadge level={row.riskLevel} className="h-5 text-[11px]" /></td>
                <td className="px-3">
                  <TableActionGroup
                    actions={[
                      { label: "查看", icon: Eye, tone: "primary" },
                      { label: row.matchedPrice ? "更换" : "询价", icon: ArrowRight, tone: row.matchedPrice ? "default" : "ai", href: row.matchedPrice ? undefined : "/inquiries/create" },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WorkflowCard>
  );
}
