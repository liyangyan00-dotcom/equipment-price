"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Box,
  CheckCircle2,
  ChevronDown,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  Globe2,
  ListChecks,
  GitCompareArrows,
  History,
  Languages,
  LoaderCircle,
  MailCheck,
  PackageCheck,
  PencilLine,
  RefreshCw,
  Search,
  Save,
  Send,
  Settings,
  ShieldAlert,
  UsersRound,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  InquiryAttachmentDialog,
  type InquiryAttachment,
} from "@/components/inquiries/InquiryAttachmentDialog";
import {
  InquiryTemplateDialog,
  type InquiryTemplate,
} from "@/components/inquiries/InquiryTemplateDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type { AiExecutionTaskDetail } from "@/types/aiExecution";
import type { PriceCollectionLeadDetailResponse } from "@/types/priceCollection";

type StatTone = "blue" | "green" | "purple" | "orange" | "cyan";

type StatItem = {
  label: string;
  value: string;
  unit: string;
  trend: string;
  description: string;
  icon: LucideIcon;
  tone: StatTone;
};

type InquiryItem = {
  id: number;
  code: string;
  name: string;
  specification: string;
  category: string;
  supplierCount: number;
  supplierIds: string[];
  language: string;
  status: "complete" | "missing";
  mappingReason?: string;
};

type SupplierRecord = {
  id: string;
  legacyId: string;
  name: string;
  region: string;
  reviewStatus: string;
  riskLevel: string;
  primaryContact: string;
};

type LetterVersion = {
  id: string;
  version_number: number;
  source: "ai" | "manual" | "restored";
  language: string;
  content: string;
  config: Record<string, unknown>;
  change_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
  created_by: string;
};

type InquiryLetterAiOutput = {
  subject?: string;
  body?: string;
  summary?: string;
  warnings?: string[];
  missingFields?: string[];
  confidence?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  suggestedAction?: "review" | "request_info";
};

type LetterConfig = {
  project: string;
  source: string;
  supplierScope: string;
  language: "中文" | "英文" | "法文";
  deadline: string;
  delivery: string;
  warranty: string;
  priceTerm: string;
  paymentTerm: string;
  validity: string;
  forceMajeure: string;
  disputeResolution: string;
};

const initialConfig: LetterConfig = {
  project: "江北水厂提标改造项目（一期）",
  source: "BOQ-2026-0001 · 主工艺设备清单",
  supplierScope: "已选择 12 家供应商",
  language: "中文",
  deadline: "2026-09-30",
  delivery: "合同签订后 90 天内",
  warranty: "设备质保 24 个月",
  priceTerm: "含税运至指定地点（DDP）",
  paymentTerm: "预付款 10%，到货验收后支付 80%，质保金 10%",
  validity: "报价有效期 90 天",
  forceMajeure: "按合同约定执行，发生后 7 日内书面通知",
  disputeResolution: "友好协商；协商不成提交项目所在地仲裁机构",
};

function buildDefaultLetterTemplate(
  config: LetterConfig,
  itemCount = 4,
  recipient = "{{供应商名称}}",
) {
  return [
    "询价函（标准模板）",
    "",
    `收件人：${recipient}`,
    `项目名称：${config.project}`,
    "",
    "尊敬的供应商：",
    `现就上述项目所需设备进行询价，本次询价暂含 ${itemCount} 项设备。请依据随函设备清单、技术规范及商务条件提交完整报价。`,
    "",
    "一、报价范围",
    "请逐项填写品牌、型号、产地、技术参数、数量、单价、总价及备品备件价格，不得以未说明的替代型号直接报价。",
    "",
    "二、商务条件",
    `1. 价格条款：${config.priceTerm}`,
    `2. 交货要求：${config.delivery}`,
    `3. 质保要求：${config.warranty}`,
    `4. 报价截止：${config.deadline} 17:00（北京时间）`,
    `5. 付款方式：${config.paymentTerm}`,
    `6. 报价有效期：${config.validity}`,
    `7. 不可抗力：${config.forceMajeure}`,
    `8. 争议解决：${config.disputeResolution}`,
    "",
    "三、随附资料",
    "请同步提交技术参数表、性能曲线、产品样本、偏差表、交付计划及有效资质文件。",
    "",
    "四、人工确认提示",
    "本模板尚未执行 AI 生成与人工审批。正式发送前须核验供应商准入状态、设备参数、截止时间和附件完整性。",
    "",
    "联系人：{{项目联系人}}",
    "联系邮箱：{{联系邮箱}}",
  ].join("\n");
}

function buildEnglishLetterTemplate(
  config: LetterConfig,
  itemCount = 4,
  recipient = "{{Supplier Name}}",
) {
  return [
    "REQUEST FOR QUOTATION",
    "",
    `To: ${recipient}`,
    `Project: ${config.project}`,
    "",
    "Dear Supplier,",
    `We invite your quotation for ${itemCount} equipment items. Please submit a complete technical and commercial offer based on the attached equipment list and specifications.`,
    "",
    "1. Commercial terms",
    `Price term: ${config.priceTerm}`,
    `Delivery: ${config.delivery}`,
    `Warranty: ${config.warranty}`,
    `Quotation deadline: ${config.deadline} 17:00 (Beijing Time)`,
    `Payment: ${config.paymentTerm}`,
    `Offer validity: ${config.validity}`,
    "",
    "2. Required documents",
    "Please provide the technical datasheet, performance curves, deviation list, delivery schedule and valid qualification documents.",
    "",
    "This draft requires human approval before external delivery.",
  ].join("\n");
}

const statToneClass: Record<
  StatTone,
  { card: string; icon: IconBoxTone; value: string; spark: string }
> = {
  blue: {
    card: "border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70",
    icon: "blue",
    value: "text-primary",
    spark: "text-primary",
  },
  green: {
    card: "border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70",
    icon: "green",
    value: "text-success",
    spark: "text-success",
  },
  purple: {
    card: "border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/70",
    icon: "purple",
    value: "text-ai",
    spark: "text-ai",
  },
  orange: {
    card: "border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/80",
    icon: "orange",
    value: "text-warning",
    spark: "text-warning",
  },
  cyan: {
    card: "border-cyan-100 bg-gradient-to-br from-white via-white to-cyan-50/80",
    icon: "cyan",
    value: "text-[#0891B2]",
    spark: "text-[#0891B2]",
  },
};

const inquiryItems: InquiryItem[] = [
  {
    id: 1,
    code: "EQP-2026-0001",
    name: "立式多级离心泵",
    specification: "CDLF 65-30",
    category: "泵类",
    supplierCount: 12,
    supplierIds: [],
    language: "中 / 英",
    status: "complete",
  },
  {
    id: 2,
    code: "EQP-2026-0002",
    name: "轴流风机",
    specification: "GFBD-6.3-No16",
    category: "风机类",
    supplierCount: 10,
    supplierIds: [],
    language: "中 / 英",
    status: "missing",
  },
  {
    id: 3,
    code: "EQP-2026-0003",
    name: "电动蝶阀",
    specification: "D943X-16Q",
    category: "阀门类",
    supplierCount: 11,
    supplierIds: [],
    language: "中文",
    status: "complete",
  },
  {
    id: 4,
    code: "EQP-2026-0004",
    name: "超声波液位计",
    specification: "UFM-530",
    category: "仪表类",
    supplierCount: 9,
    supplierIds: [],
    language: "中 / 英 / 法",
    status: "missing",
  },
];

function parseSupplier(row: Record<string, unknown>): SupplierRecord {
  const contacts = Array.isArray(row.wpi_supplier_contacts)
    ? (row.wpi_supplier_contacts as Array<Record<string, unknown>>)
    : [];
  const primary = contacts.find((contact) => contact.is_primary) ?? contacts[0];
  return {
    id: String(row.id ?? ""),
    legacyId: String(row.legacy_id ?? row.supplier_code ?? row.id ?? ""),
    name: String(row.name ?? "未命名供应商"),
    region: String(row.region ?? row.country ?? "地区待核验"),
    reviewStatus: String(row.review_status ?? "pending"),
    riskLevel: String(row.risk_level ?? "medium"),
    primaryContact: String(primary?.name ?? "联系人待补"),
  };
}

function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[18px] border border-borderSoft bg-white shadow-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

function StatCard({ item }: { item: StatItem }) {
  const tone = statToneClass[item.tone];
  return (
    <Card
      className={cn(
        "relative h-[96px] overflow-hidden p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-panel",
        tone.card,
      )}
    >
      <div className="flex h-full min-w-0 items-center gap-3">
        <IconBox
          icon={item.icon}
          tone={tone.icon}
          size="md"
          className="size-11 shrink-0 rounded-[12px] shadow-[0_12px_24px_rgba(37,99,235,0.12)] [&_svg]:size-5"
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate whitespace-nowrap text-[12px] font-bold",
              tone.value,
            )}
            title={item.label}
          >
            {item.label}
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span
              className={cn(
                "text-[25px] font-black leading-none",
                tone.value,
              )}
            >
              {item.value}
            </span>
            <span className={cn("pb-1 text-[12px] font-bold", tone.value)}>
              {item.unit}
            </span>
          </div>
          <div
            className="mt-1.5 truncate whitespace-nowrap text-[10px] font-medium text-textMuted"
            title={item.trend}
          >
            {item.trend}
          </div>
        </div>
      </div>
    </Card>
  );
}

function WorkflowSteps({
  configComplete,
  generated,
  missingCount,
  unmappedCount,
  aiApproved,
  sendReady,
}: {
  configComplete: boolean;
  generated: boolean;
  missingCount: number;
  unmappedCount: number;
  aiApproved: boolean;
  sendReady: boolean;
}) {
  const mappingComplete = missingCount === 0 && unmappedCount === 0;
  const steps = [
    {
      label: "配置询价范围",
      detail: configComplete ? "基础配置完整" : "仍有必填项",
      status: configComplete ? "completed" : "active",
    },
    {
      label: "映射设备与供应商",
      detail: mappingComplete ? "映射与参数完整" : `${unmappedCount} 项未映射 · ${missingCount} 项缺参数`,
      status: mappingComplete ? "completed" : configComplete ? "active" : "pending",
    },
    {
      label: "AI生成询价函",
      detail: aiApproved ? "草稿已人工批准" : generated ? "草稿待人工批准" : "等待生成草稿",
      status: generated && aiApproved ? "completed" : mappingComplete ? "active" : "pending",
    },
    {
      label: "人工确认并创建任务",
      detail: sendReady ? "发送前校验已通过" : "等待前置条件",
      status: sendReady ? "active" : "pending",
    },
  ] as const;

  return (
    <Card className="overflow-hidden px-3 py-2.5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step.label}
            type="button"
            onClick={() =>
              document
                .getElementById(index === 1 ? "inquiry-mapping" : index >= 2 ? "letter-preview" : "letter-config")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition",
              step.status === "completed" &&
                "border-success/25 bg-success-soft text-success",
              step.status === "active" &&
                "border-ai/30 bg-ai-soft text-ai shadow-[0_8px_20px_rgba(124,58,237,0.10)]",
              step.status === "pending" &&
                "border-borderSoft bg-[var(--color-bg-muted)] text-textMuted",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                step.status === "completed" && "bg-success text-white",
                step.status === "active" && "bg-ai text-white",
                step.status === "pending" && "bg-white text-textMuted",
              )}
            >
              {step.status === "completed" ? <CheckCircle2 className="size-3.5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate whitespace-nowrap text-[12px] font-bold">{step.label}</span>
              <span className="mt-0.5 block truncate text-[10px] font-medium opacity-75">{step.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function SelectLike({
  label,
  value,
  options,
  required,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block w-full min-w-0 max-w-full overflow-hidden">
      <span className="mb-1.5 block text-[12px] font-semibold text-textSecondary">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      <span className="relative flex h-9 w-full min-w-0 max-w-full items-center overflow-hidden rounded-[8px] border border-borderSoft bg-white px-3 text-[12px] font-medium text-textMain shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
        <span className="block min-w-0 flex-1 truncate pr-6" title={value}>
          {value}
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="absolute inset-0 z-10 h-full w-full max-w-full cursor-pointer appearance-none opacity-0 outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 z-0 size-3.5 shrink-0 text-textMuted" />
      </span>
    </label>
  );
}

function ConfigPanel({
  config,
  selectedSuppliers,
  supplierLoading,
  onChange,
  onSelectSuppliers,
  onUpload,
  termsOpen,
  onToggleTerms,
}: {
  config: LetterConfig;
  selectedSuppliers: SupplierRecord[];
  supplierLoading: boolean;
  onChange: (key: keyof LetterConfig, value: string) => void;
  onSelectSuppliers: () => void;
  onUpload: () => void;
  termsOpen: boolean;
  onToggleTerms: () => void;
}) {
  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden scroll-mt-20 p-4" id="letter-config">
      <SectionTitle index="1." icon={Settings} title="询价函配置" />
      <div className="mt-4 grid w-full min-w-0 max-w-full gap-3 overflow-hidden">
        <SelectLike
          label="项目名称"
          value={config.project}
          options={[
            "江北水厂提标改造项目（一期）",
            "Kinshasa 水厂扩建项目",
            "污水处理设备更新项目",
          ]}
          required
          onChange={(value) => onChange("project", value)}
        />
        <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.5rem] items-end gap-2 overflow-hidden">
          <SelectLike
            label="设备清单来源"
            value={config.source}
            options={[
              "BOQ-2026-0001 · 主工艺设备清单",
              "设备价格库选中项",
              "手工询价清单",
            ]}
            required
            onChange={(value) => onChange("source", value)}
          />
          <button
            type="button"
            onClick={onUpload}
            className="mb-0.5 h-9 w-10 min-w-0 overflow-hidden whitespace-nowrap rounded-md border border-borderSoft px-0 text-[11px] font-semibold text-primary"
          >
            导入
          </button>
        </div>
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <span className="mb-1.5 block text-[12px] font-semibold text-textSecondary">
            真实供应商映射<span className="ml-0.5 text-danger">*</span>
          </span>
          <button
            type="button"
            onClick={onSelectSuppliers}
            disabled={supplierLoading}
            className="flex min-h-10 w-full min-w-0 max-w-full items-start justify-between gap-2 overflow-hidden rounded-[8px] border border-ai-border bg-ai-soft px-3 py-2 text-left text-[12px] font-semibold text-ai disabled:cursor-wait disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
              {supplierLoading
                ? "正在读取 Supabase 供应商..."
                : selectedSuppliers.length
                  ? `${selectedSuppliers.length} 家：${selectedSuppliers.map((supplier) => supplier.name).join("、")}`
                  : "请选择已准入或待复核供应商"}
            </span>
            <UsersRound className="mt-0.5 size-4 shrink-0" />
          </button>
          <p className="mt-1 max-w-full break-words text-[10px] text-textMuted">
            供应商名称、准入状态与联系人来自真实供应商库。
          </p>
        </div>
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <span className="mb-1.5 block text-[12px] font-semibold text-textSecondary">
            语言选择<span className="ml-0.5 text-danger">*</span>
          </span>
          <div className="grid min-w-0 grid-cols-3 gap-1.5">
            {["中文", "英文", "法文"].map((language) => (
              <button
                key={language}
                className={cn(
                  "h-9 min-w-0 overflow-hidden whitespace-nowrap rounded-[8px] border px-1 text-[11px] font-semibold",
                  config.language === language
                    ? "border-primary bg-primary/10 text-primary shadow-[0_8px_18px_rgba(47,107,255,0.12)]"
                    : "border-borderSoft bg-white text-textSecondary",
                )}
                type="button"
                onClick={() => onChange("language", language)}
              >
                {config.language === language ? (
                  <Languages className="mr-1 inline size-3.5" />
                ) : null}
                {language}
              </button>
            ))}
          </div>
        </div>
        <label className="block w-full min-w-0 max-w-full overflow-hidden">
          <span className="mb-1.5 block text-[12px] font-semibold text-textSecondary">
            报价截止时间<span className="ml-0.5 text-danger">*</span>
          </span>
          <input
            type="date"
            value={config.deadline}
            onChange={(event) => onChange("deadline", event.target.value)}
            className="box-border h-9 w-full min-w-0 max-w-full rounded-[8px] border border-borderSoft px-3 text-[12px] outline-none focus:border-primary"
          />
        </label>
        <SelectLike
          label="交货期要求"
          value={config.delivery}
          options={[
            "合同签订后 60 天内",
            "合同签订后 90 天内",
            "合同签订后 120 天内",
          ]}
          onChange={(value) => onChange("delivery", value)}
        />
        <SelectLike
          label="质保要求"
          value={config.warranty}
          options={["设备质保 12 个月", "设备质保 24 个月", "设备质保 36 个月"]}
          onChange={(value) => onChange("warranty", value)}
        />
        <SelectLike
          label="价格条款"
          value={config.priceTerm}
          options={[
            "含税运至指定地点（DDP）",
            "CIF Kinshasa Port",
            "FOB 离岸价",
          ]}
          onChange={(value) => onChange("priceTerm", value)}
        />
        {termsOpen ? (
          <div className="grid w-full min-w-0 gap-3 rounded-[10px] border border-warning/25 bg-warning-soft/35 p-3">
            <SelectLike
              label="付款方式"
              value={config.paymentTerm}
              options={[
                "预付款 10%，到货验收后支付 80%，质保金 10%",
                "预付款 20%，发货前支付 70%，质保金 10%",
                "信用证（L/C）按里程碑支付",
              ]}
              onChange={(value) => onChange("paymentTerm", value)}
            />
            <SelectLike
              label="报价有效期"
              value={config.validity}
              options={["报价有效期 60 天", "报价有效期 90 天", "报价有效期 120 天"]}
              onChange={(value) => onChange("validity", value)}
            />
            <SelectLike
              label="不可抗力"
              value={config.forceMajeure}
              options={[
                "按合同约定执行，发生后 7 日内书面通知",
                "按 ICC 不可抗力条款执行",
              ]}
              onChange={(value) => onChange("forceMajeure", value)}
            />
            <SelectLike
              label="争议解决"
              value={config.disputeResolution}
              options={[
                "友好协商；协商不成提交项目所在地仲裁机构",
                "提交中国国际经济贸易仲裁委员会仲裁",
              ]}
              onChange={(value) => onChange("disputeResolution", value)}
            />
          </div>
        ) : null}
      </div>
      <button
        onClick={onToggleTerms}
        className="mt-4 inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden text-[12px] font-semibold text-primary"
        type="button"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", termsOpen && "rotate-180")} />
        {termsOpen ? "收起商务条款" : "更多商务条款（可选）"}
      </button>
    </Card>
  );
}

function SectionTitle({
  index,
  icon,
  title,
  right,
}: {
  index?: string;
  icon?: LucideIcon;
  title: string;
  right?: ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <IconBox icon={Icon} tone="purple" size="sm" /> : null}
        <h2 className="truncate text-[18px] font-black text-textMain">
          {index ? <span className="mr-1">{index}</span> : null}
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function LetterPreview({
  config,
  previewMode,
  generated,
  content,
  editing,
  versionCount,
  recipientLabel,
  itemCount,
  onPreviewMode,
  onContentChange,
  onEditing,
  onCompare,
  onHistory,
}: {
  config: LetterConfig;
  previewMode: "single" | "bilingual";
  generated: boolean;
  content: string;
  editing: boolean;
  versionCount: number;
  recipientLabel: string;
  itemCount: number;
  onPreviewMode: (mode: "single" | "bilingual") => void;
  onContentChange: (content: string) => void;
  onEditing: (editing: boolean) => void;
  onCompare: () => void;
  onHistory: () => void;
}) {
  return (
    <Card className="min-w-0 overflow-hidden scroll-mt-20 p-4" id="letter-preview">
      <SectionTitle
        index="2."
        icon={MailCheck}
        title="AI询价函内容预览"
        right={
          <div className="flex flex-wrap items-center justify-end gap-1 text-[11px] font-semibold">
            <button
              onClick={() => onPreviewMode("single")}
              className={cn(
                "rounded-[6px] px-4 py-1.5",
                previewMode === "single"
                  ? "bg-primary/10 text-primary"
                  : "text-textMuted",
              )}
              type="button"
            >
              {config.language}预览
            </button>
            <button
              onClick={() => onPreviewMode("bilingual")}
              className={cn(
                "rounded-[6px] px-4 py-1.5",
                previewMode === "bilingual"
                  ? "bg-ai-soft text-ai"
                  : "text-textMuted",
              )}
              type="button"
            >
              双语对照
            </button>
            <button
              onClick={() => onEditing(!editing)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-[6px] border px-2.5",
                editing
                  ? "border-primary bg-primary text-white"
                  : "border-borderSoft bg-white text-primary",
              )}
              type="button"
            >
              <PencilLine className="size-3.5" />
              {editing ? "完成编辑" : "编辑正文"}
            </button>
            <button
              onClick={onCompare}
              className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-ai-border bg-ai-soft px-2.5 text-ai"
              type="button"
            >
              <GitCompareArrows className="size-3.5" />
              对比AI稿
            </button>
            <button
              onClick={onHistory}
              className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-borderSoft bg-white px-2.5 text-textSecondary"
              type="button"
            >
              <History className="size-3.5" />
              V{versionCount || 0}
            </button>
          </div>
        }
      />
      <div className="mt-3 rounded-[12px] border border-borderSoft bg-white px-5 py-4 text-[13px] leading-7 text-textMain shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-textMuted">
            {editing ? "人工编辑中 · 保存后生成新版本" : `当前语言：${config.language}`}
          </span>
          <StatusBadge
            status={generated ? "completed" : "pending"}
            label={generated ? "AI草稿已生成" : "标准模板 · 待AI生成"}
            className="h-5 text-[11px]"
          />
        </div>
        {editing ? (
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            className="min-h-[540px] w-full resize-y rounded-[10px] border border-primary/30 bg-blue-50/25 p-4 text-[13px] leading-7 text-textMain outline-none focus:border-primary"
            aria-label="询价函正文编辑器"
          />
        ) : previewMode === "bilingual" ? (
          <div className="grid min-h-[540px] min-w-0 gap-3 lg:grid-cols-2">
            <article className="min-w-0 whitespace-pre-wrap rounded-[10px] border border-primary/15 bg-blue-50/20 px-3 py-2 text-[13px] leading-7 text-textSecondary">
              {content || buildDefaultLetterTemplate(config, itemCount, recipientLabel)}
            </article>
            <article className="min-w-0 whitespace-pre-wrap rounded-[10px] border border-ai-border bg-ai-soft/25 px-3 py-2 text-[13px] leading-7 text-textSecondary">
              {buildEnglishLetterTemplate(config, itemCount, recipientLabel)}
            </article>
          </div>
        ) : (
          <article className="min-h-[540px] whitespace-pre-wrap rounded-[10px] bg-white px-3 py-2 text-[13px] leading-7 text-textSecondary">
            {content || buildDefaultLetterTemplate(config, itemCount, recipientLabel)}
          </article>
        )}
      </div>
    </Card>
  );
}

function AdvicePanel({
  missingCount,
  attachmentCount,
  onAnalyze,
  onCompleteParams,
  onCompleteTerms,
  onBilingual,
  onAttachments,
}: {
  missingCount: number;
  attachmentCount: number;
  onAnalyze: () => void;
  onCompleteParams: () => void;
  onCompleteTerms: () => void;
  onBilingual: () => void;
  onAttachments: () => void;
}) {
  const advices = [
    {
      title: `缺失参数提醒（共 ${missingCount} 项）`,
      text: "部分设备缺少关键参数，可能影响供应商准确报价。",
      action: "查看详情并补充",
      icon: ShieldAlert,
      tone: "red" as IconBoxTone,
    },
    {
      title: "建议补充商务条款",
      text: "建议补充付款方式、不可抗力、违约责任等条款，以降低合同风险。",
      action: "去补充条款",
      icon: Settings,
      tone: "orange" as IconBoxTone,
    },
    {
      title: "推荐使用双语模板",
      text: "检测到供应商包含海外厂商，建议启用双语模板以提高沟通效率。",
      action: "预览双语版本",
      icon: Languages,
      tone: "purple" as IconBoxTone,
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionTitle
          index="3."
          icon={Bot}
          title="AI智能建议"
          right={
            <button
              onClick={onAnalyze}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
              type="button"
            >
              <RefreshCw className="size-3.5" />
              重新分析
            </button>
          }
        />
        <div className="mt-3 space-y-3">
          {advices.map((advice, index) => (
            <div
              key={advice.title}
              className="rounded-[12px] border border-borderSoft bg-gradient-to-br from-white to-[var(--color-bg-muted)] p-3"
            >
              <div className="flex items-start gap-3">
                <IconBox icon={advice.icon} tone={advice.tone} size="sm" />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-[13px] font-black",
                      advice.tone === "red"
                        ? "text-danger"
                        : advice.tone === "orange"
                          ? "text-warning"
                          : "text-ai",
                    )}
                  >
                    {advice.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-textSecondary">
                    {advice.text}
                  </p>
                  <button
                    onClick={
                      index === 0
                        ? onCompleteParams
                        : index === 1
                          ? onCompleteTerms
                          : onBilingual
                    }
                    className="mt-2 text-[12px] font-semibold text-primary"
                    type="button"
                  >
                    {advice.action} &gt;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={FileArchive} title={`询价附件（已归档 ${attachmentCount} / 建议 4）`} />
          <button
            type="button"
            onClick={onAttachments}
            className="text-[12px] font-semibold text-primary"
          >
            管理附件 &gt;
          </button>
        </div>
        <div className="mt-3 grid gap-2 text-[12px] text-textSecondary">
          {[
            "技术规范书（摘要）",
            "图纸清单（关键图纸版）",
            "交货地点及要求说明",
            "供应商资质要求",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MappingTable({
  items,
  suppliers,
  onToggleSupplier,
  onBatchLanguage,
  onDetail,
  onEdit,
}: {
  items: InquiryItem[];
  suppliers: SupplierRecord[];
  onToggleSupplier: (id: number, supplierId: string) => void;
  onBatchLanguage: () => void;
  onDetail: (item: InquiryItem) => void;
  onEdit: (item: InquiryItem) => void;
}) {
  const supplierCount = items.reduce(
    (sum, item) => sum + item.supplierIds.length,
    0,
  );
  const supplierColumns = suppliers.slice(0, 3);
  return (
    <Card className="scroll-mt-20 p-4" id="inquiry-mapping">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          index="4."
          icon={PackageCheck}
          title="设备清单与供应商映射"
        />
        <div className="flex items-center gap-3 text-[12px] text-textMuted">
          <span>
            已展示 <b className="text-primary">{items.length}</b> 项设备，当前{" "}
            <b className="text-ai">{supplierCount}</b> 个供应商映射
          </span>
          <button
            onClick={onBatchLanguage}
            className="h-8 rounded-[8px] border border-ai-border bg-ai-soft px-3 font-semibold text-ai"
            type="button"
          >
            批量设置语言
          </button>
        </div>
      </div>
      <div className="mt-3 max-w-full overflow-x-auto rounded-[12px] border border-borderSoft">
        <table className="w-full min-w-[1050px] border-collapse text-[12px]">
          <thead className="bg-[var(--color-bg-muted)] text-textSecondary">
            <tr className="[&>th]:border-b [&>th]:border-borderSoft [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-center [&>th]:font-bold">
              <th>序号</th>
              <th>设备名称</th>
              <th>规格 / 型号</th>
              <th>设备分类</th>
              <th>供应商数量</th>
              <th colSpan={3}>真实供应商映射</th>
              <th>语言</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
            <tr className="[&>th]:border-b [&>th]:border-borderSoft [&>th]:px-3 [&>th]:py-2 [&>th]:text-center [&>th]:font-semibold">
              <th colSpan={5} />
              {[0, 1, 2].map((index) => (
                <th key={index} title={supplierColumns[index]?.name}>
                  {supplierColumns[index]?.name ?? `供应商 ${index + 1}`}
                </th>
              ))}
              <th colSpan={3} />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.code}
                className="border-b border-borderSoft last:border-b-0 hover:bg-blue-50/35"
              >
                <td className="px-3 py-2.5 text-center text-textSecondary">
                  {item.id}
                </td>
                <td className="px-3 py-2.5 font-semibold text-textMain">
                  {item.name}
                </td>
                <td className="px-3 py-2.5 text-textSecondary">
                  {item.specification}
                </td>
                <td className="px-3 py-2.5 text-center">{item.category}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-primary">
                  {item.supplierIds.length} / {item.supplierCount}
                </td>
                {[0, 1, 2].map((index) => {
                  const supplier = supplierColumns[index];
                  const selected = supplier
                    ? item.supplierIds.includes(supplier.legacyId)
                    : false;
                  return (
                    <td
                      key={`${item.code}-${supplier?.legacyId ?? index}`}
                      className="px-3 py-2.5 text-center"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          supplier && onToggleSupplier(item.id, supplier.legacyId)
                        }
                        disabled={!supplier}
                        aria-label={`${selected ? "取消" : "添加"}${supplier?.name ?? "供应商"}映射`}
                        title={supplier ? `${supplier.name} · ${supplier.reviewStatus}` : "请先选择供应商"}
                        className="mx-auto flex size-7 items-center justify-center rounded-md hover:bg-primary-soft"
                      >
                        {selected ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <span className="text-textMuted">—</span>
                        )}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center text-textSecondary">
                  {item.language}
                </td>
                <td className="w-[92px] min-w-[92px] px-2 py-2.5 text-center">
                  <StatusBadge
                    status={
                      item.status === "complete" ? "completed" : "needs_info"
                    }
                    label={item.status === "complete" ? "参数完整" : "缺少参数"}
                    className="inline-flex h-5 max-w-full whitespace-nowrap px-1.5 text-[10px]"
                  />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="inline-flex flex-nowrap gap-2">
                    <button
                      onClick={() => onDetail(item)}
                      className="whitespace-nowrap rounded-md border border-borderSoft px-2 py-1 text-[12px] font-semibold text-primary"
                      type="button"
                    >
                      查看映射
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="whitespace-nowrap rounded-md border border-ai-border bg-ai-soft px-2 py-1 text-[12px] font-semibold text-ai"
                      type="button"
                    >
                      调整映射
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BottomActions({
  onGenerate,
  onBilingual,
  onExport,
  onSend,
  onSave,
  sendDisabled,
  sendReason,
  busy,
}: {
  onGenerate: () => void;
  onBilingual: () => void;
  onExport: (format: "Word" | "PDF") => void;
  onSend: () => void;
  onSave: () => void;
  sendDisabled: boolean;
  sendReason: string;
  busy: boolean;
}) {
  const actions = [
    {
      label: "AI 生成询价函",
      icon: WandSparkles,
      className:
        "border-primary bg-primary text-white shadow-[0_16px_30px_rgba(47,107,255,0.22)]",
      action: onGenerate,
      disabled: busy,
      title: busy ? "当前操作尚未完成" : "调用已配置的 AI Provider 生成询价函草稿",
    },
    {
      label: "预览双语版本",
      icon: Languages,
      className: "border-primary/30 bg-white text-primary",
      action: onBilingual,
      disabled: busy,
      title: "预览当前询价函的中英双语版本",
    },
    {
      label: "下载 Word",
      icon: FileText,
      className: "border-primary/30 bg-white text-primary",
      action: () => onExport("Word"),
      disabled: busy,
      title: "下载当前询价函 Word 文件",
    },
    {
      label: "导出 PDF",
      icon: Download,
      className: "border-primary/30 bg-white text-primary",
      action: () => onExport("PDF"),
      disabled: busy,
      title: "打开当前询价函 PDF 打印视图",
    },
    {
      label: "提交询价任务",
      icon: Send,
      className: "border-success/35 bg-white text-success",
      action: onSend,
      disabled: sendDisabled || busy,
      title: sendReason,
    },
    {
      label: "保存模板",
      icon: Save,
      className: "border-warning/40 bg-white text-warning",
      action: onSave,
      disabled: busy,
      title: busy ? "当前操作尚未完成" : "保存当前配置为可复用模板",
    },
  ];

  return (
    <div className="sticky bottom-2 z-20 rounded-[12px] border border-borderSoft bg-white/95 p-2 shadow-[0_14px_36px_rgba(15,42,79,0.14)] backdrop-blur">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            onClick={action.action}
            disabled={action.disabled}
            title={action.title}
            key={action.label}
            className={cn(
              "inline-flex h-10 min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[8px] border px-2 text-[12px] font-bold transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none",
              action.className,
            )}
            type="button"
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{action.label}</span>
          </button>
        );
        })}
      </div>
      {sendDisabled ? (
        <p className="mt-1.5 truncate px-1 text-[10px] font-medium text-warning" title={sendReason}>
          提交前仍需处理：{sendReason}
        </p>
      ) : null}
    </div>
  );
}

type PreflightIssue = {
  label: string;
  detail: string;
  targetId: "letter-config" | "letter-preview" | "inquiry-mapping";
};

function SendPreflightPanel({ issues }: { issues: PreflightIssue[] }) {
  const ready = issues.length === 0;
  return (
    <Card className={cn("border px-4 py-3", ready ? "border-success/25 bg-success-soft" : "border-warning/30 bg-warning-soft")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={ready ? CheckCircle2 : ShieldAlert} tone={ready ? "green" : "orange"} size="sm" />
          <div className="min-w-0">
            <p className={cn("text-[13px] font-black", ready ? "text-success" : "text-warning")}>
              {ready ? "发送前校验已通过" : `发送前校验待处理（${issues.length} 项）`}
            </p>
            <p className="mt-0.5 text-[11px] text-textSecondary">
              {ready ? "可提交询价任务进入人工复核；系统不会自动发送外部邮件。" : "完成以下阻断项后，才可提交询价任务。"}
            </p>
          </div>
        </div>
        {!ready ? (
          <div className="flex max-w-full flex-wrap justify-end gap-2">
            {issues.map((issue) => (
              <button
                key={issue.label}
                type="button"
                title={issue.detail}
                onClick={() => document.getElementById(issue.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="max-w-[220px] truncate rounded-md border border-warning/30 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-warning"
              >
                {issue.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function BatchLanguageDialog({
  open,
  value,
  onChange,
  onClose,
  onApply,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  if (!open) return null;
  const options = [
    { value: "中文", detail: "适用于境内供应商" },
    { value: "英文", detail: "适用于国际供应商" },
    { value: "法文", detail: "适用于法语区供应商" },
    { value: "中 / 英", detail: "生成中英双语询价函" },
    { value: "中 / 英 / 法", detail: "生成三语询价函" },
  ];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="批量设置询价语言">
      <div className="w-full max-w-md rounded-[12px] border border-borderSoft bg-white p-4 shadow-[0_24px_70px_rgba(15,42,79,0.24)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-black text-textMain">批量设置询价语言</h3>
            <p className="mt-1 text-[11px] text-textMuted">将应用到当前设备清单，并使已批准的 AI 草稿重新进入人工确认。</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md border border-borderSoft text-textMuted" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-[10px] border p-3 text-left transition",
                value === option.value ? "border-ai bg-ai-soft text-ai" : "border-borderSoft bg-white text-textSecondary hover:border-primary/35",
              )}
            >
              <span className="block text-[12px] font-black">{option.value}</span>
              <span className="mt-1 block text-[10px] opacity-75">{option.detail}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary">取消</button>
          <button type="button" onClick={onApply} className="h-9 rounded-md bg-ai px-4 text-[12px] font-bold text-white">应用到全部设备</button>
        </div>
      </div>
    </div>
  );
}

function SupplierPicker({
  open,
  suppliers,
  selectedIds,
  loading,
  onToggle,
  onClose,
  onApply,
}: {
  open: boolean;
  suppliers: SupplierRecord[];
  selectedIds: string[];
  loading: boolean;
  onToggle: (supplierId: string) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  if (!open) return null;
  const visible = suppliers.filter((supplier) =>
    `${supplier.name} ${supplier.legacyId} ${supplier.region}`
      .toLowerCase()
      .includes(keyword.trim().toLowerCase()),
  );
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <button type="button" aria-label="关闭供应商选择" className="flex-1" onClick={onClose} />
      <aside className="flex h-full w-[560px] max-w-full flex-col border-l border-borderSoft bg-white shadow-panel">
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[17px] font-black text-textMain">选择真实供应商</h2>
            <p className="mt-1 text-[12px] text-textMuted">
              数据来自 Supabase 供应商库；准入状态仅供人工决策。
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b border-borderSoft p-4">
          <label className="flex h-10 items-center gap-2 rounded-md border border-borderSoft px-3">
            <Search className="size-4 text-textMuted" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索供应商名称、编号或地区"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-[13px] text-textMuted">
              <LoaderCircle className="size-4 animate-spin" />读取供应商库
            </div>
          ) : (
            <div className="grid gap-2">
              {visible.map((supplier) => {
                const checked = selectedIds.includes(supplier.legacyId);
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => onToggle(supplier.legacyId)}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left",
                      checked ? "border-primary bg-primary-soft" : "border-borderSoft bg-white hover:border-primary/40",
                    )}
                  >
                    <span className={cn("flex size-5 items-center justify-center rounded border", checked ? "border-primary bg-primary text-white" : "border-borderSoft")}>
                      {checked ? <CheckCircle2 className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate text-[13px] text-textMain">{supplier.name}</b>
                      <span className="mt-0.5 block truncate text-[11px] text-textMuted">
                        {supplier.legacyId} · {supplier.region} · {supplier.primaryContact}
                      </span>
                    </span>
                    <StatusBadge
                      status={supplier.reviewStatus === "approved" ? "completed" : "pending"}
                      label={supplier.reviewStatus === "approved" ? "已准入" : "待复核"}
                      className="h-5 text-[10px]"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-borderSoft px-5 py-4">
          <span className="text-[12px] text-textMuted">已选择 {selectedIds.length} 家</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold">取消</button>
            <button type="button" onClick={onApply} disabled={selectedIds.length === 0} className="h-9 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50">应用映射</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function VersionDrawer({
  open,
  mode,
  versions,
  aiContent,
  currentContent,
  loading,
  onMode,
  onRestore,
  onClose,
}: {
  open: boolean;
  mode: "compare" | "history";
  versions: LetterVersion[];
  aiContent: string;
  currentContent: string;
  loading: boolean;
  onMode: (mode: "compare" | "history") => void;
  onRestore: (version: LetterVersion) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const aiLines = aiContent.split("\n");
  const manualLines = currentContent.split("\n");
  const changedCount = Math.max(aiLines.length, manualLines.length) - aiLines.filter((line, index) => line === manualLines[index]).length;
  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <button type="button" aria-label="关闭版本面板" className="flex-1" onClick={onClose} />
      <aside className="flex h-full w-[760px] max-w-full flex-col border-l border-borderSoft bg-white shadow-panel">
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[17px] font-black text-textMain">询价函版本与差异</h2>
            <p className="mt-1 text-[12px] text-textMuted">AI 原稿与人工稿当前有 {Math.max(changedCount, 0)} 处段落差异。</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="flex gap-1 border-b border-borderSoft px-5 py-2">
          <button type="button" onClick={() => onMode("compare")} className={cn("h-8 rounded-md px-3 text-[12px] font-semibold", mode === "compare" ? "bg-ai-soft text-ai" : "text-textMuted")}>AI版本差异</button>
          <button type="button" onClick={() => onMode("history")} className={cn("h-8 rounded-md px-3 text-[12px] font-semibold", mode === "history" ? "bg-primary-soft text-primary" : "text-textMuted")}>草稿历史 ({versions.length})</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {mode === "compare" ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[
                { title: "AI 原始版本", lines: aiLines, other: manualLines, tone: "border-ai-border bg-ai-soft/30" },
                { title: "当前人工版本", lines: manualLines, other: aiLines, tone: "border-primary/30 bg-primary-soft/30" },
              ].map((column) => (
                <section key={column.title} className={cn("rounded-lg border p-3", column.tone)}>
                  <h3 className="mb-3 text-[13px] font-black text-textMain">{column.title}</h3>
                  <div className="grid gap-1.5">
                    {column.lines.map((line, index) => (
                      <p key={`${column.title}-${index}`} className={cn("rounded px-2 py-1 text-[11px] leading-5", line !== column.other[index] ? "bg-warning-soft text-warning" : "text-textSecondary")}>
                        {line || "（空行）"}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-textMuted"><LoaderCircle className="size-4 animate-spin" />读取版本历史</div>
          ) : versions.length ? (
            <div className="grid gap-2">
              {versions.map((version) => (
                <article key={version.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-borderSoft p-3">
                  <IconBox icon={version.source === "ai" ? WandSparkles : PencilLine} tone={version.source === "ai" ? "purple" : "blue"} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[13px] text-textMain">V{version.version_number}</b>
                      <StatusBadge status="completed" label={version.source === "ai" ? "AI生成" : version.source === "restored" ? "恢复版本" : "人工编辑"} className="h-5 text-[10px]" />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-textMuted">{version.change_summary || "保存询价函草稿"}</p>
                    <p className="mt-1 text-[10px] text-textMuted">{new Date(version.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  <button type="button" onClick={() => onRestore(version)} className="h-8 rounded-md border border-borderSoft px-3 text-[11px] font-semibold text-primary">恢复</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-borderSoft p-8 text-center text-[12px] text-textMuted">保存草稿后，这里会记录可审计的版本历史。</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ItemDrawer({
  item,
  edit,
  suppliers,
  onClose,
  onSave,
}: {
  item: InquiryItem | null;
  edit: boolean;
  suppliers: SupplierRecord[];
  onClose: () => void;
  onSave: (item: InquiryItem) => void;
}) {
  const [draft, setDraft] = useState<InquiryItem | null>(() => item);
  const [keyword, setKeyword] = useState("");

  if (!item) return null;
  const shown = draft ?? item;
  const mappedSuppliers = suppliers.filter((supplier) => shown.supplierIds.includes(supplier.legacyId));
  const visibleSuppliers = suppliers.filter((supplier) =>
    `${supplier.name} ${supplier.region} ${supplier.primaryContact}`.toLowerCase().includes(keyword.trim().toLowerCase()),
  );
  const toggleDraftSupplier = (supplierId: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        supplierIds: current.supplierIds.includes(supplierId)
          ? current.supplierIds.filter((id) => id !== supplierId)
          : [...current.supplierIds, supplierId],
      };
    });
  };
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭设备详情"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="flex h-full w-[520px] max-w-full flex-col border-l border-borderSoft bg-white shadow-panel">
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-textMain">
              {edit ? "调整设备供应商映射" : "设备供应商映射详情"}
            </h2>
            <p className="mt-1 text-[12px] text-textMuted">
              {shown.code} · {shown.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <section className="rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-black text-textMain">{shown.name}</p>
                <p className="mt-1 break-words text-[11px] text-textMuted">{shown.code} · {shown.specification} · {shown.category}</p>
              </div>
              <Link
                href={`/equipment-prices/${encodeURIComponent(shown.code)}`}
                className="shrink-0 rounded-md border border-primary/25 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-primary"
              >
                查看设备档案
              </Link>
            </div>
          </section>

          {edit ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="min-w-0">
                  <span className="text-[12px] font-semibold text-textSecondary">函件语言</span>
                  <select
                    value={shown.language}
                    onChange={(event) => setDraft((current) => current ? { ...current, language: event.target.value } : current)}
                    className="mt-1 h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"
                  >
                    <option>中文</option><option>英文</option><option>法文</option><option>中 / 英</option><option>中 / 英 / 法</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="text-[12px] font-semibold text-textSecondary">参数状态</span>
                  <select
                    value={shown.status}
                    onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value as InquiryItem["status"] } : current)}
                    className="mt-1 h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"
                  >
                    <option value="complete">参数完整</option><option value="missing">缺少参数</option>
                  </select>
                </label>
              </div>
              <label className="block min-w-0">
                <span className="text-[12px] font-semibold text-textSecondary">映射理由</span>
                <textarea
                  value={shown.mappingReason ?? ""}
                  onChange={(event) => setDraft((current) => current ? { ...current, mappingReason: event.target.value } : current)}
                  placeholder="说明供应商与本设备匹配的产品范围、历史报价或技术能力依据"
                  className="mt-1 min-h-20 w-full min-w-0 resize-y rounded-md border border-borderSoft p-3 text-[12px] leading-5 outline-none focus:border-primary"
                />
              </label>
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-black text-textMain">候选供应商</h3>
                    <p className="text-[11px] text-textMuted">已选择 {shown.supplierIds.length} 家，仅用于当前询价设备。</p>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" />
                  <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索供应商、地区或联系人" className="h-9 w-full rounded-md border border-borderSoft pl-9 pr-3 text-[12px] outline-none focus:border-primary" />
                </div>
                <div className="mt-2 max-h-[310px] space-y-2 overflow-y-auto pr-1">
                  {visibleSuppliers.map((supplier) => {
                    const selected = shown.supplierIds.includes(supplier.legacyId);
                    return (
                      <button key={supplier.legacyId} type="button" onClick={() => toggleDraftSupplier(supplier.legacyId)} className={cn("flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 text-left", selected ? "border-primary/35 bg-primary-soft" : "border-borderSoft bg-white")}>
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border", selected ? "border-primary bg-primary text-white" : "border-borderSoft text-transparent")}><CheckCircle2 className="size-3.5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-textMain">{supplier.name}</span>
                          <span className="mt-1 block truncate text-[10px] text-textMuted">{supplier.region} · {supplier.primaryContact || "联系人待补"}</span>
                        </span>
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", supplier.riskLevel === "high" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>{supplier.riskLevel === "high" ? "高风险" : "可候选"}</span>
                      </button>
                    );
                  })}
                  {visibleSuppliers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-borderSoft px-4 py-8 text-center">
                      <p className="text-[12px] font-semibold text-textSecondary">没有匹配的候选供应商</p>
                      <p className="mt-1 text-[10px] text-textMuted">请调整关键词，或先返回供应商库补充候选单位。</p>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <section>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-black text-textMain">已映射供应商</h3>
                  <p className="text-[11px] text-textMuted">函件语言：{shown.language} · {shown.status === "complete" ? "参数完整" : "缺少参数"}</p>
                </div>
                <StatusBadge status={shown.status === "complete" ? "completed" : "needs_info"} label={shown.status === "complete" ? "可生成函件" : "需补参数"} className="h-5 whitespace-nowrap text-[10px]" />
              </div>
              <div className="mt-3 space-y-2">
                {mappedSuppliers.length ? mappedSuppliers.map((supplier) => (
                  <div key={supplier.legacyId} className="flex min-w-0 items-center gap-3 rounded-lg border border-borderSoft p-3">
                    <IconBox icon={UsersRound} tone="cyan" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-textMain">{supplier.name}</p>
                      <p className="mt-1 truncate text-[10px] text-textMuted">{supplier.region} · {supplier.primaryContact || "联系人待补"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded bg-success-soft px-1.5 py-0.5 text-[9px] font-bold text-success">{supplier.reviewStatus}</span>
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", supplier.riskLevel === "high" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary")}>{supplier.riskLevel === "high" ? "高风险" : "风险可控"}</span>
                      </div>
                    </div>
                    <Link href={`/suppliers/${encodeURIComponent(supplier.legacyId)}`} className="shrink-0 text-[11px] font-semibold text-primary">供应商详情</Link>
                  </div>
                )) : <div className="rounded-lg border border-dashed border-borderSoft p-6 text-center text-[12px] text-textMuted">尚未映射供应商</div>}
              </div>
              {shown.mappingReason ? <div className="mt-3 rounded-lg border border-borderSoft bg-slate-50 p-3 text-[12px] leading-5 text-textSecondary"><b className="text-textMain">映射理由：</b>{shown.mappingReason}</div> : null}
            </section>
          )}
          <div className="rounded-lg border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
            <b className="text-ai">AI 判断：</b>
            {shown.status === "missing"
              ? "关键参数仍不完整，建议人工补全后再发送询价函。"
              : "参数完整，可进入函件生成与人工确认流程。"}
          </div>
        </div>
        {edit ? (
          <div className="flex justify-end gap-3 border-t border-borderSoft bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-borderSoft px-4 text-[13px] font-semibold"
            >
              取消
            </button>
            <button
              type="button"
              disabled={shown.supplierIds.length === 0}
              onClick={() => onSave(shown)}
              className="h-9 rounded-md bg-ai px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              保存映射
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function RealAiTaskDialog({
  open,
  task,
  busy,
  reviewNote,
  onReviewNote,
  onClose,
  onApprove,
  onRequestChanges,
}: {
  open: boolean;
  task: AiExecutionTaskDetail | null;
  busy: boolean;
  reviewNote: string;
  onReviewNote: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  if (!open) return null;
  const output = (task?.output_payload ?? {}) as InquiryLetterAiOutput;
  const awaitingReview = task?.status === "needs_review";
  const approved = task?.status === "completed" && task.review_decision === "approved";
  const failed = task?.status === "failed";
  const statusLabel = task
    ? approved
      ? "人工已批准"
      : awaitingReview
        ? "等待人工审批"
        : failed
          ? "执行失败"
          : `AI执行中 ${task.progress}%`
    : "正在创建真实 AI 任务";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <section className="w-full max-w-[720px] overflow-hidden rounded-card border border-ai/25 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <header className="flex items-start justify-between gap-4 border-b border-borderSoft bg-gradient-to-r from-ai-soft via-white to-primary-soft px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconBox icon={WandSparkles} tone="purple" size="md" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-black text-textMain">真实 AI 询价函任务</h2>
                <StatusBadge
                  status={failed ? "rejected" : approved ? "completed" : awaitingReview ? "needs_review" : "running"}
                  label={statusLabel}
                />
              </div>
              <p className="mt-1 text-[11px] text-textMuted">
                {task?.task_code ?? "任务创建中"} · 结果写入 Supabase，必须人工审批后才能进入发送前校验。
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-textMuted hover:bg-white">
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-textSecondary">
              <span>{task?.stage ?? "accepted"}</span>
              <span>{task?.progress ?? 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-ai to-primary transition-all duration-500" style={{ width: `${task?.progress ?? 4}%` }} />
            </div>
          </div>

          {task?.output_payload ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-ai/20 bg-ai-soft p-3">
                <p className="text-[10px] text-textMuted">AI置信度</p>
                <b className="mt-1 block text-[18px] text-ai">{task.confidence ?? output.confidence ?? 0}%</b>
              </div>
              <div className="rounded-lg border border-warning/25 bg-warning-soft p-3">
                <p className="text-[10px] text-textMuted">风险等级</p>
                <b className="mt-1 block text-[15px] text-warning">{String(task.risk_level ?? output.riskLevel ?? "medium").toUpperCase()}</b>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary-soft p-3">
                <p className="text-[10px] text-textMuted">正文长度</p>
                <b className="mt-1 block text-[18px] text-primary">{output.body?.length ?? 0}</b>
              </div>
            </div>
          ) : null}

          {output.summary ? (
            <div className="rounded-lg border border-ai/20 bg-ai-soft/70 p-3 text-[12px] leading-6 text-textSecondary">
              <b className="mr-2 text-ai">AI摘要</b>{output.summary}
            </div>
          ) : null}

          {(output.warnings?.length || output.missingFields?.length) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-warning/25 bg-warning-soft/60 p-3">
                <b className="text-[12px] text-warning">风险提醒</b>
                <ul className="mt-2 space-y-1 text-[11px] text-textSecondary">
                  {(output.warnings ?? []).map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-borderSoft bg-slate-50 p-3">
                <b className="text-[12px] text-textMain">缺失字段</b>
                <ul className="mt-2 space-y-1 text-[11px] text-textSecondary">
                  {(output.missingFields ?? []).map((item) => <li key={item}>• {item}</li>)}
                  {!output.missingFields?.length ? <li>未发现额外缺失字段</li> : null}
                </ul>
              </div>
            </div>
          ) : null}

          {awaitingReview ? (
            <label className="block">
              <span className="text-[11px] font-bold text-textMain">人工审批意见</span>
              <textarea
                value={reviewNote}
                onChange={(event) => onReviewNote(event.target.value)}
                rows={3}
                placeholder="确认内容、风险和供应商范围；要求修改时请填写具体原因。"
                className="mt-1.5 w-full resize-none rounded-lg border border-borderSoft px-3 py-2 text-[12px] outline-none focus:border-ai"
              />
            </label>
          ) : null}

          {failed ? (
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-3 text-[11px] text-danger">
              {task?.error_message || "AI执行失败，请检查 Provider、模型、余额或提示词配置。"}
            </div>
          ) : null}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft bg-slate-50 px-5 py-3">
          <p className="text-[10px] text-textMuted">AI只生成草稿，审批结论由当前授权用户提交并写入任务审计事件。</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary">关闭</button>
            {awaitingReview ? (
              <>
                <button type="button" disabled={busy} onClick={onRequestChanges} className="h-8 rounded-md border border-warning/35 bg-warning-soft px-3 text-[11px] font-bold text-warning disabled:opacity-50">要求修改</button>
                <button type="button" disabled={busy} onClick={onApprove} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success px-3 text-[11px] font-bold text-white disabled:opacity-50">
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  批准当前 AI 草稿
                </button>
              </>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function AiInquiryLetterPage() {
  const router = useRouter();
  const toast = useMockToast();
  const [config, setConfig] = useState(initialConfig);
  const [items, setItems] = useState(inquiryItems);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(true);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [inquiryHydrated, setInquiryHydrated] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [batchLanguageOpen, setBatchLanguageOpen] = useState(false);
  const [batchLanguage, setBatchLanguage] = useState("中 / 英");
  const [versions, setVersions] = useState<LetterVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionMode, setVersionMode] = useState<"compare" | "history">("compare");
  const [letterContent, setLetterContent] = useState(() => buildDefaultLetterTemplate(initialConfig, inquiryItems.length));
  const [templateLinked, setTemplateLinked] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [editingContent, setEditingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"single" | "bilingual">(
    "single",
  );
  const [generated, setGenerated] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTask, setAiTask] = useState<AiExecutionTaskDetail | null>(null);
  const [aiTaskBusy, setAiTaskBusy] = useState(false);
  const [aiReviewNote, setAiReviewNote] = useState("");
  const [approvalInvalidated, setApprovalInvalidated] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [attachments, setAttachments] = useState<InquiryAttachment[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<InquiryItem | null>(null);
  const [editItem, setEditItem] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [linkedContext] = useState(() => {
    const parameters = typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
    return {
      leadId: parameters.get("leadId") || "",
      leadName: parameters.get("leadName") || "",
      leadSpec: parameters.get("leadSpec") || "",
      leadType: parameters.get("leadType") || "",
      currency: parameters.get("currency") || "",
      source: parameters.get("source") || "price-leads",
    };
  });
  const linkedLeadId = linkedContext.leadId;
  const linkedLeadName = linkedContext.leadName;
  const linkedLeadSpec = linkedContext.leadSpec;
  const linkedLeadType = linkedContext.leadType;
  const linkedCurrency = linkedContext.currency;
  const linkedSource = linkedContext.source;

  useEffect(() => {
    if (!linkedLeadId) return;
    const controller = new AbortController();
    const hydrateLinkedLead = async () => {
      let code = linkedLeadId;
      let name = linkedLeadName;
      let specification = linkedLeadSpec;
      let type = linkedLeadType;
      let currency = linkedCurrency;
      try {
        const response = await fetch(
          `/api/price-collection?view=lead_detail&leadId=${encodeURIComponent(linkedLeadId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = await response.json().catch(() => ({})) as PriceCollectionLeadDetailResponse & { error?: string };
        if (response.ok && body.lead) {
          code = body.lead.leadCode || code;
          name = body.lead.translatedName || body.lead.name || name;
          specification = body.lead.translatedSpecification || body.lead.specification || specification;
          type = body.lead.targetType === "material" ? "地材" : "设备";
          currency = body.lead.currency || currency;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      if (!name || controller.signal.aborted) return;
      const numericId = 900000 + Array.from(code).reduce((sum, character) => sum + character.charCodeAt(0), 0);
      const linkedItem: InquiryItem = {
        id: numericId,
        code,
        name,
        specification: specification || "待补充规格",
        category: type === "地材" ? "地材价格线索" : "设备价格线索",
        supplierCount: 0,
        supplierIds: [],
        language: "中文",
        status: specification ? "complete" : "missing",
        mappingReason: `来自${linkedSource === "price-collection" ? "AI价格采集" : "价格线索池"}${currency ? ` · ${currency}` : ""}`,
      };
      setItems((current) => [linkedItem, ...current.filter((item) => item.code !== code)]);
      setConfig((current) => ({
        ...current,
        source: `价格线索 ${code} · ${linkedItem.mappingReason}`,
      }));
      setGenerated(false);
      setApprovalInvalidated(true);
    };
    void hydrateLinkedLead();
    return () => controller.abort();
  }, [linkedCurrency, linkedLeadId, linkedLeadName, linkedLeadSpec, linkedLeadType, linkedSource]);
  const notify = useCallback(
    (tone: "success" | "danger" | "warning", title: string, detail: string) => {
      toast[tone](title, detail);
    },
    [toast],
  );

  useEffect(() => {
    if (!inquiryId) return;
    let active = true;
    fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/attachments`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: InquiryAttachment[] };
        if (active && response.ok) setAttachments(payload.data ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [inquiryId]);

  useEffect(() => {
    let active = true;
    const loadSuppliers = async () => {
      setSupplierLoading(true);
      try {
        const response = await fetch("/api/suppliers", { cache: "no-store" });
        const payload = (await response.json()) as { data?: Record<string, unknown>[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "供应商读取失败");
        const records = (payload.data ?? []).map(parseSupplier);
        if (!active) return;
        setSuppliers(records);
        const params = new URLSearchParams(window.location.search);
        const existingInquiryId = params.get("inquiryId");
        if (existingInquiryId) return;
        const supplierParam = params.get("supplier") ?? params.get("supplierId");
        const preferred = supplierParam
          ? records.find((supplier) => supplier.legacyId === supplierParam || supplier.name.includes(supplierParam))
          : undefined;
        const defaults = preferred
          ? [preferred.legacyId]
          : records.filter((supplier) => supplier.reviewStatus === "approved").slice(0, 3).map((supplier) => supplier.legacyId);
        const selected = defaults.length ? defaults : records.slice(0, 3).map((supplier) => supplier.legacyId);
        setSelectedSupplierIds(selected);
        setItems((current) => current.map((item) => ({ ...item, supplierIds: selected })));
        setConfig((current) => ({ ...current, supplierScope: `已选择 ${selected.length} 家真实供应商` }));
      } catch (error) {
        if (active) toast.danger("供应商加载失败", error instanceof Error ? error.message : "请稍后重试");
      } finally {
        if (active) setSupplierLoading(false);
      }
    };
    void loadSuppliers();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const equipmentIds = params.get("equipmentIds");
    const existingInquiryId = params.get("inquiryId");
    if (equipmentIds) toast.info("已接收询价上下文", `设备：${equipmentIds}`);
    if (!existingInquiryId) {
      const forwarded = params.toString();
      router.replace(`/inquiries/create${forwarded ? `?${forwarded}` : ""}`);
      return;
    }
    const loadInquiry = async () => {
      try {
        const response = await fetch(`/api/inquiries/${encodeURIComponent(existingInquiryId)}`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: Record<string, unknown>; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || "询价草稿读取失败");
        const data = payload.data;
        setInquiryId(existingInquiryId);
        const metadata = data.metadata && typeof data.metadata === "object" ? (data.metadata as Record<string, unknown>) : {};
        const savedConfig = metadata.letterConfig && typeof metadata.letterConfig === "object" ? (metadata.letterConfig as Partial<LetterConfig>) : {};
        const loadedConfig: LetterConfig = {
          ...initialConfig,
          ...savedConfig,
          deadline: String(data.deadline ?? savedConfig.deadline ?? initialConfig.deadline).slice(0, 10),
        };
        setConfig(loadedConfig);
        const content = String(data.letter_content ?? "");
        setLetterContent(content || buildDefaultLetterTemplate(loadedConfig, inquiryItems.length));
        setTemplateLinked(!content);
        setAiContent(String(metadata.aiBaseContent ?? content));
        setGenerated(Boolean(content));
        setApprovalInvalidated(Boolean(metadata.aiApprovalInvalidated));
        const savedAiTaskId = typeof metadata.aiTaskId === "string" ? metadata.aiTaskId : "";
        if (savedAiTaskId) {
          const taskResponse = await fetch(`/api/ai/tasks?id=${encodeURIComponent(savedAiTaskId)}`, { cache: "no-store" });
          const taskPayload = (await taskResponse.json()) as { data?: AiExecutionTaskDetail };
          if (taskResponse.ok && taskPayload.data) setAiTask(taskPayload.data);
        }
        const mappedSuppliers = Array.isArray(data.wpi_inquiry_suppliers)
          ? (data.wpi_inquiry_suppliers as Array<Record<string, unknown>>)
              .map((mapping) => {
                const supplier = mapping.wpi_suppliers as Record<string, unknown> | undefined;
                return String(supplier?.legacy_id ?? "");
              })
              .filter(Boolean)
          : [];
        setSelectedSupplierIds(mappedSuppliers);
        const savedMapping = Array.isArray(metadata.supplierMapping)
          ? (metadata.supplierMapping as Array<Record<string, unknown>>)
          : [];
        const inquiryItemRows = Array.isArray(data.wpi_inquiry_items)
          ? (data.wpi_inquiry_items as Array<Record<string, unknown>>)
          : [];
        const baseItems: InquiryItem[] = inquiryItemRows.length
          ? inquiryItemRows.map((row, index) => {
              const rowMetadata = row.metadata && typeof row.metadata === "object"
                ? (row.metadata as Record<string, unknown>)
                : {};
              const code = String(rowMetadata.sourceLegacyId ?? row.legacy_id ?? `ITEM-${index + 1}`)
                .split(":")
                .at(-1) ?? `ITEM-${index + 1}`;
              const specification = String(row.specification ?? "");
              return {
                id: index + 1,
                code,
                name: String(row.item_name ?? `询价项 ${index + 1}`),
                specification,
                category: String(row.item_type ?? "equipment") === "material" ? "地材类" : "设备类",
                supplierCount: mappedSuppliers.length,
                supplierIds: mappedSuppliers,
                language: loadedConfig.language,
                status: specification.trim() ? "complete" : "missing",
              };
            })
          : inquiryItems;
        setItems(
          baseItems.map((item) => {
            const mapping = savedMapping.find((entry) => entry.code === item.code || entry.itemId === item.code);
            const supplierIds = Array.isArray(mapping?.supplierIds)
              ? mapping.supplierIds.map(String).filter(Boolean)
              : mappedSuppliers;
            const status = mapping?.status === "missing" ? "missing" : mapping?.status === "complete" ? "complete" : item.status;
            return {
              ...item,
              supplierIds,
              language: typeof mapping?.language === "string" ? mapping.language : item.language,
              status,
              mappingReason: typeof mapping?.mappingReason === "string" ? mapping.mappingReason : item.mappingReason,
            };
          }),
        );
        setConfig((current) => ({
          ...current,
          supplierScope: mappedSuppliers.length
            ? `已选择 ${mappedSuppliers.length} 家真实供应商`
            : "尚未选择真实供应商",
        }));
      } catch (error) {
        toast.danger("草稿加载失败", error instanceof Error ? error.message : "请稍后重试");
      } finally {
        setInquiryHydrated(true);
      }
    };
    void loadInquiry();
  }, [router, toast]);

  const missingCount = useMemo(
    () => items.filter((item) => item.status === "missing").length,
    [items],
  );
  const unmappedCount = useMemo(
    () => items.filter((item) => item.supplierIds.length === 0).length,
    [items],
  );
  const selectedSuppliers = useMemo(
    () => suppliers.filter((supplier) => selectedSupplierIds.includes(supplier.legacyId)),
    [selectedSupplierIds, suppliers],
  );
  const recipientLabel = useMemo(
    () => selectedSuppliers.map((supplier) => supplier.name).join("、") || "{{供应商名称}}",
    [selectedSuppliers],
  );
  const effectiveLetterContent = templateLinked
    ? buildDefaultLetterTemplate(config, items.length, recipientLabel)
    : letterContent;
  const unapprovedSupplierCount = useMemo(
    () => selectedSuppliers.filter((supplier) => supplier.reviewStatus !== "approved").length,
    [selectedSuppliers],
  );
  const mappedSupplierCount = useMemo(
    () => items.reduce((sum, item) => sum + item.supplierIds.length, 0),
    [items],
  );
  const aiApproved = aiTask?.status === "completed" && aiTask.review_decision === "approved" && !approvalInvalidated;
  const deadlineValid = useMemo(
    () => Boolean(config.deadline) && config.deadline > today,
    [config.deadline, today],
  );
  const configComplete = Boolean(config.project.trim() && config.source.trim() && config.deadline && deadlineValid);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!inquiryId || !["dirty", "saving", "error"].includes(autoSaveStatus)) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSaveStatus, inquiryId]);

  useEffect(() => {
    if (!inquiryHydrated || !inquiryId || saving) return;
    const dirtyTimer = window.setTimeout(() => setAutoSaveStatus("dirty"), 0);
    const timer = window.setTimeout(async () => {
      setAutoSaveStatus("saving");
      const supplierIds = [...new Set(items.flatMap((item) => item.supplierIds))];
      try {
        const response = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: `${config.project}设备询价`,
            deadline: config.deadline ? `${config.deadline}T17:00:00+08:00` : undefined,
            letterContent: effectiveLetterContent,
            supplierIds,
            metadata: {
              letterConfig: config,
              aiBaseContent: aiContent,
              aiTaskId: aiTask?.id ?? null,
              aiApprovalStatus: approvalInvalidated ? "invalidated" : aiTask?.review_decision ?? null,
              aiApprovalInvalidated: approvalInvalidated,
              supplierMapping: items.map((item) => ({
                code: item.code,
                supplierIds: item.supplierIds,
                language: item.language,
                status: item.status,
                mappingReason: item.mappingReason ?? "",
              })),
              autoSavedAt: new Date().toISOString(),
            },
          }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "自动保存失败");
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
      } catch {
        setAutoSaveStatus("error");
      }
    }, 900);
    return () => {
      window.clearTimeout(dirtyTimer);
      window.clearTimeout(timer);
    };
  }, [aiContent, aiTask?.id, aiTask?.review_decision, approvalInvalidated, config, effectiveLetterContent, inquiryHydrated, inquiryId, items, saving]);
  const preflightIssues = useMemo<PreflightIssue[]>(() => {
    const issues: PreflightIssue[] = [];
    if (!config.project.trim() || !config.source.trim()) {
      issues.push({ label: "补齐询价基础配置", detail: "项目名称和设备清单来源不能为空。", targetId: "letter-config" });
    }
    if (!deadlineValid) {
      issues.push({ label: "修正报价截止日期", detail: "报价截止日期必须晚于当前日期。", targetId: "letter-config" });
    }
    if (unmappedCount > 0) {
      issues.push({ label: `完成 ${unmappedCount} 项供应商映射`, detail: "每项设备至少需要映射一家候选供应商。", targetId: "inquiry-mapping" });
    }
    if (missingCount > 0) {
      issues.push({ label: `补齐 ${missingCount} 项设备参数`, detail: "存在关键参数缺失的设备，不能进入发送复核。", targetId: "inquiry-mapping" });
    }
    if (unapprovedSupplierCount > 0) {
      issues.push({ label: `复核 ${unapprovedSupplierCount} 家供应商`, detail: "映射供应商尚未全部通过准入复核。", targetId: "inquiry-mapping" });
    }
    if (!generated || !effectiveLetterContent.trim()) {
      issues.push({ label: "生成询价函正文", detail: "请先生成或填写询价函正文。", targetId: "letter-preview" });
    } else if (!aiApproved) {
      issues.push({ label: "人工批准 AI 草稿", detail: approvalInvalidated ? "配置或正文已变更，需要重新人工批准。" : "AI草稿尚未完成人工审批。", targetId: "letter-preview" });
    }
    return issues;
  }, [aiApproved, approvalInvalidated, config.project, config.source, deadlineValid, effectiveLetterContent, generated, missingCount, unmappedCount, unapprovedSupplierCount]);
  const sendReady = preflightIssues.length === 0;
  const pageStats = useMemo<StatItem[]>(
    () => [
      {
        label: "待生成询价函",
        value: generated ? "0" : "1",
        unit: "份",
        trend: generated ? "草稿已生成" : "等待AI生成",
        description: "查看当前询价函草稿",
        icon: FileText,
        tone: "orange",
      },
      {
        label: "已生成询价函",
        value: generated ? "1" : "0",
        unit: "份",
        trend: generated ? "待人工确认" : "尚未生成",
        description: "查看已生成草稿",
        icon: FileCheck2,
        tone: "green",
      },
      {
        label: "供应商映射",
        value: String(mappedSupplierCount),
        unit: "项",
        trend: `覆盖 ${items.length} 项设备`,
        description: "查看设备与供应商映射",
        icon: UsersRound,
        tone: "purple",
      },
      {
        label: "设备项数",
        value: String(items.length),
        unit: "项",
        trend: `${items.filter((item) => item.status === "complete").length} 项参数完整`,
        description: "查看当前询价设备",
        icon: Box,
        tone: "blue",
      },
      {
        label: "待确认参数",
        value: String(missingCount),
        unit: "项",
        trend: missingCount === 0 ? "已完成补充" : "需要人工补充",
        description: "定位待补充设备参数",
        icon: Settings,
        tone: "orange",
      },
      {
        label: "支持语言",
        value: "3",
        unit: "种",
        trend: `当前：${config.language}`,
        description: "配置询价函语言",
        icon: Globe2,
        tone: "cyan",
      },
    ],
    [config.language, generated, items, mappedSupplierCount, missingCount],
  );
  const changeConfig = (key: keyof LetterConfig, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setGenerated(false);
    setApprovalInvalidated(true);
  };
  const toggleSupplier = (id: number, supplierId: string) => {
    const nextItems = items.map((item) =>
      item.id === id
        ? {
            ...item,
            supplierIds: item.supplierIds.includes(supplierId)
              ? item.supplierIds.filter((value) => value !== supplierId)
              : [...item.supplierIds, supplierId],
          }
        : item,
    );
    setItems(nextItems);
    setSelectedSupplierIds([...new Set(nextItems.flatMap((item) => item.supplierIds))]);
    setGenerated(false);
    setApprovalInvalidated(true);
  };
  const loadVersions = async (targetInquiryId: string) => {
    setVersionsLoading(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(targetInquiryId)}/versions`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as { data?: LetterVersion[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "版本读取失败");
      setVersions(payload.data ?? []);
    } catch (error) {
      toast.danger("版本读取失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setVersionsLoading(false);
    }
  };
  const persistDraft = async (
    source: "ai" | "manual" | "restored" = "manual",
    contentOverride?: string,
    changeSummary?: string,
    aiConfidence?: number | null,
    aiTaskId?: string,
    approvalStatusOverride?: string | null,
  ) => {
    const content = contentOverride ?? effectiveLetterContent;
    const supplierIds = [...new Set(items.flatMap((item) => item.supplierIds))];
    const persistedApprovalInvalidated = approvalStatusOverride === "approved" ? false : approvalInvalidated;
    const persistedApprovalStatus = approvalStatusOverride ?? (persistedApprovalInvalidated ? "invalidated" : aiTask?.review_decision ?? null);
    if (!config.project.trim()) {
      toast.warning("无法保存草稿", "请先选择项目名称。");
      return null;
    }
    setSaving(true);
    try {
      let targetInquiryId = inquiryId;
      if (!targetInquiryId) {
        const createResponse = await fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: `${config.project}设备询价`,
            deadline: config.deadline ? `${config.deadline}T17:00:00+08:00` : undefined,
            letterContent: content || undefined,
            supplierIds,
            items: items.map((item) => ({
              id: item.code,
              sourceId: item.code,
              category: item.category,
              name: item.name,
              specification: item.specification,
              quantity: 1,
              unit: "台",
            })),
            metadata: {
              letterConfig: config,
              aiBaseContent: source === "ai" ? content : aiContent,
              aiTaskId: aiTaskId || aiTask?.id || null,
              aiApprovalStatus: persistedApprovalStatus,
              aiApprovalInvalidated: persistedApprovalInvalidated,
              supplierMapping: items.map((item) => ({
                code: item.code,
                supplierIds: item.supplierIds,
                language: item.language,
                status: item.status,
                mappingReason: item.mappingReason ?? "",
              })),
            },
          }),
        });
        const created = (await createResponse.json()) as { data?: { id?: string; legacy_id?: string }; error?: string };
        if (!createResponse.ok || !created.data?.id) throw new Error(created.error || "创建询价草稿失败");
        targetInquiryId = created.data.id;
        setInquiryId(targetInquiryId);
        window.history.replaceState(null, "", `/ai-inquiry-letter?inquiryId=${encodeURIComponent(targetInquiryId)}`);
      } else {
        const updateResponse = await fetch(`/api/inquiries/${encodeURIComponent(targetInquiryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: `${config.project}设备询价`,
            deadline: config.deadline ? `${config.deadline}T17:00:00+08:00` : undefined,
            letterContent: content,
            supplierIds,
            metadata: {
              letterConfig: config,
              aiBaseContent: source === "ai" ? content : aiContent,
              aiTaskId: aiTaskId || aiTask?.id || null,
              aiApprovalStatus: persistedApprovalStatus,
              aiApprovalInvalidated: persistedApprovalInvalidated,
              supplierMapping: items.map((item) => ({
                code: item.code,
                supplierIds: item.supplierIds,
                language: item.language,
                status: item.status,
                mappingReason: item.mappingReason ?? "",
              })),
            },
          }),
        });
        const updated = (await updateResponse.json()) as { error?: string };
        if (!updateResponse.ok) throw new Error(updated.error || "更新询价草稿失败");
      }

      if (content.trim()) {
        const versionResponse = await fetch(`/api/inquiries/${encodeURIComponent(targetInquiryId)}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            language: config.language,
            content,
            config: { ...config, supplierIds, itemCount: items.length, aiTaskId: aiTaskId || aiTask?.id || null },
            changeSummary: changeSummary || (source === "ai" ? "AI生成询价函草稿" : source === "restored" ? "从历史版本恢复并保存" : "人工编辑并保存询价函正文"),
            aiConfidence: source === "ai" ? (aiConfidence ?? aiTask?.confidence ?? null) : null,
          }),
        });
        const versionPayload = (await versionResponse.json()) as { error?: string };
        if (!versionResponse.ok) throw new Error(versionPayload.error || "版本保存失败");
      }
      await loadVersions(targetInquiryId);
      setAutoSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
      toast.success("草稿已持久化", `询价配置、真实供应商映射${content.trim() ? "和正文版本" : ""}已写入 Supabase。`);
      return targetInquiryId;
    } catch (error) {
      toast.danger("草稿保存失败", error instanceof Error ? error.message : "请稍后重试");
      return null;
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (!saving) void persistDraft("manual", effectiveLetterContent, "用户手动保存当前询价函草稿");
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });
  const runAiGeneration = async () => {
    if (!config.project || !config.source || !config.supplierScope) {
      toast.warning("询价配置不完整", "请先补齐项目、设备清单来源和供应商范围。");
      document
        .getElementById("letter-config")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!deadlineValid) {
      toast.warning("报价截止时间无效", "请选择晚于当前时间的报价截止日期。");
      document
        .getElementById("letter-config")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (unmappedCount > 0) {
      toast.warning(
        "存在未映射设备",
        `仍有 ${unmappedCount} 项设备没有候选供应商，请先完成映射。`,
      );
      document
        .getElementById("inquiry-mapping")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setAiOpen(true);
    setAiTask(null);
    setAiReviewNote("");
    setAiTaskBusy(true);
    const targetInquiryId = await persistDraft("manual", effectiveLetterContent, "提交真实 AI 询价函任务前保存配置");
    if (!targetInquiryId) {
      setAiTaskBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "inquiry_letter",
          title: `${config.project} AI询价函生成`,
          sourceLabel: config.source,
          businessObjectType: "inquiry",
          businessObjectId: targetInquiryId,
          businessHref: `/ai-inquiry-letter?inquiryId=${encodeURIComponent(targetInquiryId)}`,
          idempotencyKey: `${targetInquiryId}-inquiry-letter-${Date.now()}`,
          input: {
            requestedLanguage: config.language,
            previewMode,
            project: config.project,
            deadline: config.deadline,
            delivery: config.delivery,
            warranty: config.warranty,
            priceTerm: config.priceTerm,
            source: config.source,
            items: items.map((item) => ({
              code: item.code,
              name: item.name,
              specification: item.specification,
              category: item.category,
              parameterStatus: item.status,
              suppliers: item.supplierIds
                .map((supplierId) => suppliers.find((supplier) => supplier.legacyId === supplierId))
                .filter(Boolean)
                .map((supplier) => ({
                  id: supplier?.legacyId,
                  name: supplier?.name,
                  region: supplier?.region,
                  admissionStatus: supplier?.reviewStatus,
                  riskLevel: supplier?.riskLevel,
                })),
            })),
            policy: {
              humanReviewRequired: true,
              doNotInventMissingFacts: true,
              doNotSendAutomatically: true,
            },
          },
        }),
      });
      const payload = (await response.json()) as { data?: AiExecutionTaskDetail; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "AI任务创建失败");
      let currentTask = { ...payload.data, events: payload.data.events ?? [] } as AiExecutionTaskDetail;
      setAiTask(currentTask);

      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (["needs_review", "completed", "failed", "cancelled"].includes(currentTask.status)) break;
        await new Promise((resolve) => window.setTimeout(resolve, 1250));
        const taskResponse = await fetch(`/api/ai/tasks?id=${encodeURIComponent(currentTask.id)}`, { cache: "no-store" });
        const taskPayload = (await taskResponse.json()) as { data?: AiExecutionTaskDetail; error?: string };
        if (!taskResponse.ok || !taskPayload.data) throw new Error(taskPayload.error || "AI任务进度读取失败");
        currentTask = taskPayload.data;
        setAiTask(currentTask);
      }

      if (currentTask.status === "failed") throw new Error(currentTask.error_message || "AI询价函生成失败");
      if (currentTask.status !== "needs_review" && currentTask.status !== "completed") {
        throw new Error("AI任务执行超时，请稍后在 AI 工作台继续查看");
      }
      const output = (currentTask.output_payload ?? {}) as InquiryLetterAiOutput;
      if (!output.body?.trim()) throw new Error("AI结果未包含可复核的询价函正文");
      setAiContent(output.body);
      setLetterContent(output.body);
      setTemplateLinked(false);
      setGenerated(true);
      setApprovalInvalidated(false);
      await persistDraft(
        "ai",
        output.body,
        `真实 AI 任务 ${currentTask.task_code} 生成草稿，等待人工审批`,
        currentTask.confidence,
        currentTask.id,
      );
      toast.success("真实 AI 草稿已生成", "正文、置信度和风险结果已持久化，请完成右侧人工审批。 ");
    } catch (error) {
      toast.danger("AI询价函生成失败", error instanceof Error ? error.message : "请检查模型与集成配置");
    } finally {
      setAiTaskBusy(false);
    }
  };
  const generate = () => {
    void runAiGeneration();
  };

  const reviewAiTask = async (decision: "approved" | "request_changes") => {
    if (!aiTask) return;
    if (decision === "request_changes" && aiReviewNote.trim().length < 5) {
      toast.warning("请填写修改意见", "要求 AI 修改时需填写至少 5 个字符的具体意见。 ");
      return;
    }
    setAiTaskBusy(true);
    try {
      const response = await fetch(`/api/ai/tasks/${encodeURIComponent(aiTask.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", decision, reviewNote: aiReviewNote }),
      });
      const payload = (await response.json()) as { data?: AiExecutionTaskDetail; error?: string; queued?: boolean };
      if (!response.ok || !payload.data) throw new Error(payload.error || "人工审批提交失败");
      const nextTask = { ...aiTask, ...payload.data } as AiExecutionTaskDetail;
      setAiTask(nextTask);
      if (decision === "approved") {
        setApprovalInvalidated(false);
        const savedId = await persistDraft(
          "manual",
          effectiveLetterContent,
          `人工批准 AI 任务 ${aiTask.task_code} 的当前草稿`,
          null,
          aiTask.id,
          "approved",
        );
        if (savedId) {
          await fetch(`/api/inquiries/${encodeURIComponent(savedId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metadata: { aiTaskId: aiTask.id, aiApprovalStatus: "approved", aiApprovedAt: new Date().toISOString() } }),
          });
        }
        toast.success("AI草稿已人工批准", "当前版本已通过审批，可以进入发送前校验。 ");
      } else {
        toast.info("AI任务已重新排队", "网关将根据人工意见重新生成，稍后可在 AI 工作台查看。 ");
      }
    } catch (error) {
      toast.danger("审批提交失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setAiTaskBusy(false);
    }
  };
  const exportFormat = async (format: "Word" | "PDF") => {
    if (!effectiveLetterContent.trim()) {
      toast.warning("暂无可导出正文", "请先生成或编辑询价函正文。");
      return;
    }
    const savedId = inquiryId ?? await persistDraft("manual", effectiveLetterContent, `导出 ${format} 前保存当前版本`);
    if (!savedId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/inquiries/${encodeURIComponent(savedId)}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: format.toLowerCase(), content: effectiveLetterContent, title: `${config.project}-询价函` }),
      });
      const payload = (await response.json()) as { data?: { url: string; fileName: string; printRequired: boolean }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "导出任务创建失败");
      if (payload.data.printRequired) {
        const printWindow = window.open(payload.data.url, "_blank", "noopener,noreferrer");
        if (!printWindow) throw new Error("浏览器阻止了打印窗口，请允许弹出窗口后重试");
        toast.success("PDF 打印文档已生成", "服务端已登记导出任务；请在新窗口选择“另存为 PDF”。");
      } else {
        const anchor = document.createElement("a");
        anchor.href = payload.data.url;
        anchor.download = payload.data.fileName;
        anchor.click();
        toast.success("Word 已真实生成", "文件已写入 Supabase Storage，导出动作已进入审计日志。 ");
      }
    } catch (error) {
      toast.danger("导出失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <div className="flex items-center gap-2 text-[12px] text-textMuted">
          <Link href={inquiryId ? `/inquiries/${encodeURIComponent(inquiryId)}` : "/inquiries"} className="font-semibold text-primary">
            询价任务
          </Link>
          <span>/</span>
          <span>当前位置：询价函工作台</span>
        </div>
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox
                icon={ListChecks}
                tone="purple"
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-[20px] font-black text-textMain">
                  询价函工作台
                </h1>
                <p className="mt-0.5 truncate text-[12px] text-textMuted">
                  基于已创建任务进行 AI 重生成、双语处理、版本比较、人工审批和导出。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {inquiryId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (autoSaveStatus === "error") void persistDraft("manual", effectiveLetterContent, "自动保存失败后手动重试");
                  }}
                  disabled={autoSaveStatus !== "error" || saving}
                  title={autoSaveStatus === "error" ? "点击重试保存" : lastSavedAt ? `最近保存：${new Date(lastSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "草稿保存状态"}
                  className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold",
                  autoSaveStatus === "error"
                    ? "border-danger/25 bg-danger-soft text-danger"
                    : autoSaveStatus === "saving" || autoSaveStatus === "dirty"
                      ? "border-warning/25 bg-warning-soft text-warning"
                      : "border-success/25 bg-success-soft text-success",
                )}>
                  {autoSaveStatus === "saving" ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
                  {autoSaveStatus === "dirty"
                    ? "有修改"
                    : autoSaveStatus === "saving"
                      ? "自动保存中"
                      : autoSaveStatus === "error"
                        ? "自动保存失败"
                        : lastSavedAt
                          ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
                          : "已保存到 Supabase"}
                </button>
              ) : null}
              <StatusBadge
                status={aiApproved ? "completed" : aiTask?.status === "needs_review" ? "needs_review" : aiTask?.status === "running" || aiTask?.status === "queued" ? "running" : generated ? "pending" : "pending"}
                label={
                  aiApproved
                    ? "AI草稿已人工批准"
                    : aiTask?.status === "needs_review"
                      ? "AI草稿待人工审批"
                      : aiTask?.status === "running" || aiTask?.status === "queued"
                        ? `AI执行中 ${aiTask.progress}%`
                        : generated
                    ? missingCount === 0
                      ? "草稿已生成，尚未审批"
                      : `草稿已生成，待补 ${missingCount} 项`
                    : "等待生成"
                }
              />
              <button
                type="button"
                onClick={() => void persistDraft("manual")}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
              >
                {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {saving ? "保存中" : "保存草稿"}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={aiTaskBusy}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ai px-3 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(124,58,237,0.20)] disabled:cursor-wait disabled:opacity-60"
              >
                {aiTaskBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
                {aiTaskBusy ? "真实AI执行中" : generated ? "重新生成" : "AI生成询价函"}
              </button>
            </div>
          </div>
        </Card>
        <WorkflowSteps
          configComplete={configComplete}
          generated={generated}
          missingCount={missingCount}
          unmappedCount={unmappedCount}
          aiApproved={aiApproved}
          sendReady={sendReady}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {pageStats.map((item, index) => (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                const targetId =
                  index <= 1
                    ? "letter-preview"
                    : index <= 4
                      ? "inquiry-mapping"
                      : "letter-config";
                document
                  .getElementById(targetId)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                toast.info(item.label, item.description);
              }}
              className="text-left"
            >
              <StatCard item={item} />
            </button>
          ))}
        </div>
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.55fr)_minmax(280px,0.9fr)]">
          <ConfigPanel
            config={config}
            selectedSuppliers={selectedSuppliers}
            supplierLoading={supplierLoading}
            onChange={changeConfig}
            onSelectSuppliers={() => setSupplierPickerOpen(true)}
            onUpload={() => setUploadOpen(true)}
            termsOpen={termsOpen}
            onToggleTerms={() => setTermsOpen((current) => !current)}
          />
          <LetterPreview
            config={config}
            previewMode={previewMode}
            generated={generated}
            content={effectiveLetterContent}
            editing={editingContent}
            versionCount={versions.length}
            recipientLabel={recipientLabel}
            itemCount={items.length}
            onPreviewMode={setPreviewMode}
            onContentChange={(content) => {
              setLetterContent(content);
              setTemplateLinked(false);
              setGenerated(true);
              setApprovalInvalidated(true);
            }}
            onEditing={setEditingContent}
            onCompare={() => {
              setVersionMode("compare");
              setVersionOpen(true);
            }}
            onHistory={() => {
              setVersionMode("history");
              setVersionOpen(true);
              if (inquiryId) void loadVersions(inquiryId);
            }}
          />
          <AdvicePanel
            missingCount={missingCount}
            attachmentCount={attachments.length}
            onAnalyze={generate}
            onCompleteParams={() => {
              const target = items.find((item) => item.status === "missing");
              if (target) {
                setActiveItem(target);
                setEditItem(true);
              }
            }}
            onCompleteTerms={() => {
              setTermsOpen(true);
              document.getElementById("letter-config")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onBilingual={() => setPreviewMode("bilingual")}
            onAttachments={() => {
              const relatedObject = inquiryId || "inquiry-letter-draft";
              router.push(`/attachments?relatedObject=${encodeURIComponent(relatedObject)}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }}
          />
        </div>
        <MappingTable
          items={items}
          suppliers={selectedSuppliers}
          onToggleSupplier={toggleSupplier}
          onBatchLanguage={() => {
            setBatchLanguageOpen(true);
          }}
          onDetail={(item) => {
            setActiveItem(item);
            setEditItem(false);
          }}
          onEdit={(item) => {
            setActiveItem(item);
            setEditItem(true);
          }}
        />
        <SendPreflightPanel issues={preflightIssues} />
        <BottomActions
          onGenerate={generate}
          onBilingual={() => {
            setPreviewMode("bilingual");
            document.getElementById("letter-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onExport={exportFormat}
          onSend={() => {
            if (!generated) {
              toast.warning(
                "询价函尚未生成",
                "请先生成并人工确认询价函草稿。 ",
              );
              return;
            }
            if (!aiApproved) {
              toast.warning(
                "AI草稿尚未获人工批准",
                "请打开真实 AI 任务面板，复核置信度、风险与正文后提交批准。",
              );
              setAiOpen(true);
              return;
            }
            if (missingCount > 0) {
              toast.warning(
                "仍有参数待确认",
                `请先补全 ${missingCount} 项设备参数，再创建询价任务。`,
              );
              document
                .getElementById("inquiry-mapping")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
            if (!deadlineValid || unmappedCount > 0) {
              toast.warning(
                "生成前校验未通过",
                "请检查报价截止日期和设备供应商映射。",
              );
              return;
            }
            if (unapprovedSupplierCount > 0) {
              toast.warning(
                "供应商准入校验未通过",
                `当前映射中有 ${unapprovedSupplierCount} 家供应商尚未完成准入复核，只能继续保存草稿。`,
              );
              setSupplierPickerOpen(true);
              return;
            }
            setSendOpen(true);
          }}
          onSave={() => setTemplateOpen(true)}
          sendDisabled={!sendReady}
          sendReason={sendReady ? "提交询价任务进入人工复核" : preflightIssues.map((issue) => issue.label).join("；")}
          busy={saving || aiTaskBusy}
        />
      </div>
      <RealAiTaskDialog
        open={aiOpen}
        task={aiTask}
        busy={aiTaskBusy}
        reviewNote={aiReviewNote}
        onReviewNote={setAiReviewNote}
        onClose={() => setAiOpen(false)}
        onApprove={() => void reviewAiTask("approved")}
        onRequestChanges={() => void reviewAiTask("request_changes")}
      />
      <InquiryAttachmentDialog
        open={uploadOpen}
        inquiryId={inquiryId}
        onClose={() => setUploadOpen(false)}
        onChanged={setAttachments}
        onNotice={notify}
      />
      <InquiryTemplateDialog
        key={`${config.project}-${config.language}`}
        open={templateOpen}
        defaultName={`${config.project}-${config.language}模板`}
        language={config.language}
        config={config}
        content={effectiveLetterContent}
        onClose={() => setTemplateOpen(false)}
        onApply={(template: InquiryTemplate) => {
          setConfig((current) => ({ ...current, ...template.config } as LetterConfig));
          setLetterContent(template.content);
          setTemplateLinked(true);
          setGenerated(true);
          setApprovalInvalidated(true);
          setTemplateOpen(false);
          toast.success("组织模板已套用", `${template.name} 的配置和正文已载入，请人工复核后保存。`);
        }}
        onNotice={notify}
      />
      <ConfirmDialog
        open={sendOpen}
        title="通过发送前校验并创建询价任务"
        description={`${config.project}：共 ${items.length} 项设备、${selectedSuppliers.length} 家已准入供应商，报价截止 ${config.deadline}。确认后将进入待复核状态，系统不会自动发送外部邮件。`}
        confirmLabel="确认并提交待复核"
        tone="default"
        onCancel={() => setSendOpen(false)}
        onConfirm={() => {
          setSendOpen(false);
          void (async () => {
            const savedId = await persistDraft("manual", effectiveLetterContent, "人工批准 AI 草稿并通过发送前校验", null, aiTask?.id);
            if (!savedId) return;
            const output = (aiTask?.output_payload ?? {}) as InquiryLetterAiOutput;
            const response = await fetch(`/api/inquiries/${encodeURIComponent(savedId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "pending_review",
                aiConfidence: aiTask?.confidence ?? output.confidence ?? null,
                riskLevel: aiTask?.risk_level ?? output.riskLevel ?? "medium",
                metadata: {
                  aiTaskId: aiTask?.id,
                  aiApprovalStatus: "approved",
                  sendPreflightPassedAt: new Date().toISOString(),
                  sendPreflight: {
                    deadlineValid,
                    unmappedCount,
                    missingCount,
                    unapprovedSupplierCount,
                    supplierCount: selectedSuppliers.length,
                    aiApproved,
                    letterGenerated: generated,
                    automaticEmailSent: false,
                  },
                },
              }),
            });
            const payload = (await response.json()) as { error?: string; issues?: string[] };
            if (!response.ok) {
              toast.danger(
                "发送前校验写入失败",
                payload.issues?.length ? payload.issues.join("；") : payload.error || "请稍后重试",
              );
              return;
            }
            toast.success("询价任务已进入待复核", "AI审批、供应商准入和发送前校验均已写入 Supabase。 ");
            window.setTimeout(
              () => router.push(`/inquiries?source=ai-inquiry-letter&created=1&inquiryId=${encodeURIComponent(savedId)}`),
              350,
            );
          })();
        }}
      />
      <BatchLanguageDialog
        open={batchLanguageOpen}
        value={batchLanguage}
        onChange={setBatchLanguage}
        onClose={() => setBatchLanguageOpen(false)}
        onApply={() => {
          setItems((current) => current.map((item) => ({ ...item, language: batchLanguage })));
          setGenerated(false);
          setApprovalInvalidated(true);
          setBatchLanguageOpen(false);
          toast.success("语言设置已更新", `全部 ${items.length} 项设备已切换为${batchLanguage}。`);
        }}
      />
      <SupplierPicker
        open={supplierPickerOpen}
        suppliers={suppliers}
        selectedIds={selectedSupplierIds}
        loading={supplierLoading}
        onToggle={(supplierId) =>
          setSelectedSupplierIds((current) =>
            current.includes(supplierId)
              ? current.filter((value) => value !== supplierId)
              : [...current, supplierId],
          )
        }
        onClose={() => setSupplierPickerOpen(false)}
        onApply={() => {
          setItems((current) =>
            current.map((item) => ({ ...item, supplierIds: selectedSupplierIds })),
          );
          setConfig((current) => ({
            ...current,
            supplierScope: `已选择 ${selectedSupplierIds.length} 家真实供应商`,
          }));
          setGenerated(false);
          setApprovalInvalidated(true);
          setSupplierPickerOpen(false);
          toast.success("真实供应商映射已更新", `已将 ${selectedSupplierIds.length} 家供应商应用到当前设备清单。`);
        }}
      />
      <VersionDrawer
        open={versionOpen}
        mode={versionMode}
        versions={versions}
        aiContent={aiContent}
        currentContent={effectiveLetterContent}
        loading={versionsLoading}
        onMode={setVersionMode}
        onRestore={(version) => {
          setLetterContent(version.content);
          setTemplateLinked(false);
          setEditingContent(true);
          setGenerated(true);
          setApprovalInvalidated(true);
          setVersionOpen(false);
          toast.info(`已载入 V${version.version_number}`, "请复核正文并保存，系统会生成新的恢复版本。");
        }}
        onClose={() => setVersionOpen(false)}
      />
      <ItemDrawer
        key={activeItem ? `${activeItem.id}-${editItem ? "edit" : "detail"}` : "closed"}
        item={activeItem}
        edit={editItem}
        suppliers={selectedSuppliers}
        onClose={() => setActiveItem(null)}
        onSave={(updatedItem) => {
          const nextItems = items.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          );
          setItems(nextItems);
          setSelectedSupplierIds([...new Set(nextItems.flatMap((item) => item.supplierIds))]);
          setGenerated(false);
          setApprovalInvalidated(true);
          setActiveItem(null);
          toast.success(
            "设备映射已保存",
            `已映射 ${updatedItem.supplierIds.length} 家供应商，函件语言为 ${updatedItem.language}。`,
          );
        }}
      />
    </AppLayout>
  );
}
