"use client";

import { ClipboardCheck, Download, Edit3, FilePlus2, Filter, MoreHorizontal, Plus, RotateCcw, Search, Sparkles, Upload } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, KpiGrid, ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import { ConfidenceBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { BatchReviewPanel, CompletionSuggestionPanel, ManagementActionToolbar } from "@/components/management";
import { editableMaterialRecords, materialBatchReviewItems, materialCollectionSuggestions, materialManagementKpis } from "@/data/mock/materialPriceManagement";
import type { DataTableColumn } from "@/types/common";

type MaterialManageRow = Record<string, unknown> & (typeof editableMaterialRecords)[number];

const columns: DataTableColumn<MaterialManageRow>[] = [
  { key: "materialCode", header: "材料编号", className: "min-w-[132px] whitespace-nowrap" },
  { key: "materialName", header: "材料名称", className: "min-w-[96px] font-semibold" },
  { key: "category", header: "类别", className: "min-w-[76px]" },
  { key: "specification", header: "规格", className: "min-w-[98px]" },
  { key: "unit", header: "单位", className: "min-w-[56px]" },
  { key: "originalPrice", header: "原始价格", align: "right", className: "min-w-[108px]", render: (row) => <PriceCell value={row.originalPrice} currency={row.currency} unit={row.unit} /> },
  { key: "usdPrice", header: "折算美元价", align: "right", className: "min-w-[104px]", render: (row) => <PriceCell value={row.usdPrice} currency="USD" /> },
  { key: "region", header: "地区", className: "min-w-[88px]" },
  { key: "source", header: "来源", className: "min-w-[78px]" },
  { key: "quoteDate", header: "报价日期", className: "min-w-[92px]" },
  { key: "transportCondition", header: "运输条件", className: "min-w-[110px]" },
  { key: "confidence", header: "可信度", className: "min-w-[104px]", render: (row) => <ConfidenceBadge level={row.confidence} className="h-5 text-[11px]" /> },
  { key: "reviewStatus", header: "审核状态", className: "min-w-[92px]", render: (row) => <StatusBadge status={row.reviewStatus} className="h-5 text-[11px]" /> },
  { key: "riskLevel", header: "风险", className: "min-w-[86px]", render: (row) => <RiskBadge level={row.riskLevel} className="h-5 text-[11px]" /> },
  { key: "actions", header: "操作", className: "min-w-[138px]", render: () => <TableActionGroup actions={[{ label: "编辑", icon: Edit3 }, { label: "审核", icon: ClipboardCheck, tone: "primary" }]} /> },
];

function MaterialManagementFilter() {
  const filters = ["材料类别", "地区", "单位", "来源", "可信度", "有效期", "风险等级"];
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <div className="grid items-end gap-3 xl:grid-cols-12">
        <label className="min-w-0 xl:col-span-3">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">关键词搜索</span>
          <span className="flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textMuted">
            <Search className="size-4" />
            <span className="truncate">材料名称 / 规格 / 地区</span>
          </span>
        </label>
        {filters.map((filter) => (
          <label key={filter} className="min-w-0 xl:col-span-1">
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">{filter}</span>
            <button className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary">
              全部 <Filter className="size-3.5 text-textMuted" />
            </button>
          </label>
        ))}
        <button className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[12px] font-semibold text-white xl:col-span-1"><Search className="size-4" />查询</button>
        <button className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[12px] font-semibold text-textSecondary xl:col-span-1"><RotateCcw className="size-4" />重置</button>
      </div>
    </section>
  );
}

function BottomInsightCards() {
  const cards = [
    { title: "AI市场调研整理", value: "86", text: "今日新增线索，68 条已整理入库。" },
    { title: "AI价格波动分析", value: "+28.4%", text: "柴油、水泥、钢筋波动靠前。" },
    { title: "AI地区价格对比建议", value: "5区", text: "Goma 水泥价格偏高，建议关注运输方式。" },
    { title: "AI价格缺口预警", value: "12", text: "沥青、钢绞线、木方存在采集缺口。" },
  ];
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <section key={card.title} className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <ModuleHeader icon={Sparkles} title={card.title} subtitle={card.text} tone="purple" density="compact" />
          <div className="mt-3 text-[28px] font-bold text-primary">{card.value}</div>
        </section>
      ))}
    </div>
  );
}

export default function MaterialPriceManagePage() {
  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-hidden">
        <PageHeader
          title="地材价格管理"
          description="批量维护地区材料价格、调研来源、运输条件、审核状态和AI采集线索。"
          actions={
            <>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white"><Plus className="size-4" />新增地材价格</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary"><Upload className="size-4" />导入调研表</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai"><Sparkles className="size-4" />AI整理记录</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary"><Download className="size-4" />导出价格表</button>
            </>
          }
        />

        <KpiGrid items={materialManagementKpis.map((item, index) => ({ ...item, icon: [FilePlus2, ClipboardCheck, Plus, Sparkles, MoreHorizontal, Filter][index], tone: ["blue", "orange", "cyan", "purple", "red", "green"][index] as never }))} />

        <ManagementActionToolbar actions={[{ label: "新增", icon: Plus, tone: "primary" }, { label: "批量导入", icon: Upload, tone: "green" }, { label: "AI整理", icon: Sparkles, tone: "ai" }, { label: "批量审核", icon: ClipboardCheck, tone: "warning" }, { label: "批量导出", icon: Download }, { label: "更多操作", icon: MoreHorizontal }]} />

        <MaterialManagementFilter />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <DataTable
            columns={columns}
            data={editableMaterialRecords as MaterialManageRow[]}
            rowKey="id"
            density="compact"
            actions={<ModuleHeader icon={Edit3} title="可编辑地材价格表" subtitle="mock 行内编辑占位，不接真实保存" tone="cyan" density="compact" />}
          />
          <div className="space-y-3">
            <CompletionSuggestionPanel title="AI建议补充采集" subtitle="缺口材料、缺口地区与采集来源" items={materialCollectionSuggestions} />
            <BatchReviewPanel items={materialBatchReviewItems} />
          </div>
        </div>

        <BottomInsightCards />
      </div>
    </AppLayout>
  );
}
