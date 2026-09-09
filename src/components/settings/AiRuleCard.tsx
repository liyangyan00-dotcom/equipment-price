import { Sparkles } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { IconBox } from "@/components/common/IconBox";

type AiRuleCardProps = {
  title: string;
  condition: string;
  action: string;
};

export function AiRuleCard({ title, condition, action }: AiRuleCardProps) {
  return (
    <div className="rounded-[12px] border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconBox icon={Sparkles} tone="purple" size="sm" />
          <p className="text-[13px] font-bold text-textMain">{title}</p>
        </div>
        <AiBadge label="规则启用" className="h-5 text-[11px]" />
      </div>
      <p className="mt-2 text-[12px] leading-5 text-textSecondary">触发条件：{condition}</p>
      <p className="mt-1 text-[12px] leading-5 text-ai">处理动作：{action}</p>
    </div>
  );
}
