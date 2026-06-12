import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ReviewStatus = "pending" | "need_info" | "confirmed" | "rejected" | "voided";

export type ConfidenceLevel = "A" | "B" | "C" | "D" | "E";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AiTaskStatus =
  | "created"
  | "running"
  | "completed"
  | "needs_review"
  | "needs_info"
  | "confirmed"
  | "rejected"
  | "voided";

export type PriceCondition =
  | "EXW"
  | "FOB"
  | "CIF"
  | "DDP"
  | "SITE"
  | "LOCAL_PICKUP"
  | "LOCAL_DELIVERY";

export type CurrencyCode = "USD" | "CNY" | "EUR" | "CDF" | string;

export type TrendDirection = "up" | "down" | "flat";

export type ComponentAction = {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "ai" | "warning" | "danger";
  disabled?: boolean;
};

export type DataTableColumn<TData> = {
  key: keyof TData | string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: TData, rowIndex: number) => ReactNode;
};
