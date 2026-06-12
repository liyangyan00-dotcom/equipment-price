import type { CurrencyCode } from "@/types/common";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type PriceCellProps = {
  value: number;
  currency?: CurrencyCode;
  unit?: string;
  condition?: string;
  className?: string;
};

export function PriceCell({ value, currency = "CNY", unit, condition, className }: PriceCellProps) {
  return (
    <div className={cn("text-right tabular-nums", className)}>
      <div className="font-semibold text-textMain">{formatCurrency(value, currency, currency === "CNY" ? "zh-CN" : "en-US")}</div>
      <div className="mt-0.5 text-[11px] text-textMuted">
        {condition ? `${condition}` : null}
        {condition && unit ? " / " : null}
        {unit ? unit : null}
      </div>
    </div>
  );
}
