import { ArrowRight, Bot, Database, FileCheck2, ShieldAlert, UserCheck } from "lucide-react";
import { IconBox } from "@/components/common/IconBox";
import { cn } from "@/lib/utils";
import type { CollectionMethod, EquipmentCatalogCollectionDraft, EquipmentDataSource } from "@/data/mock/equipmentCatalogCollection";

const priorityLabels = { high: "高", medium: "中", low: "低" } as const;

export function CollectionTaskSummaryPanel({
  draft,
  sources,
  methods,
  onEditStep,
}: {
  draft: EquipmentCatalogCollectionDraft;
  sources: EquipmentDataSource[];
  methods: CollectionMethod[];
  onEditStep?: (step: number) => void;
}) {
  const selectedSources = sources.filter((item) => draft.selectedDataSourceIds.includes(item.id));
  const selectedMethods = methods.filter((item) => draft.selectedCollectionMethodIds.includes(item.id));
  const rows = [
    ["任务名称", draft.taskName || "待填写"],
    ["品牌 / 厂家", draft.manufacturerName || "待选择"],
    ["设备类别", draft.equipmentCategory || "待选择"],
    ["任务优先级", `${priorityLabels[draft.priority]}优先级`],
    ["负责人", draft.owner || "待分配"],
    ["计划开始", draft.plannedStartAt ? draft.plannedStartAt.replace("T", " ") : "待设置"],
    ["预计完成", draft.expectedCompleteAt || "待设置"],
  ];

  return (
    <aside className="space-y-2.5 xl:sticky xl:top-20">
      <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
        <div className="flex items-center gap-2.5"><IconBox icon={FileCheck2} tone="blue" size="sm" /><div><h2 className="text-[14px] font-semibold">配置摘要</h2><p className="text-[11px] text-textMuted">随表单输入实时更新</p></div></div>
        <dl className="mt-3 divide-y divide-borderSoft">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 py-2 text-[11px]"><dt className="text-textMuted">{label}</dt><dd className="break-words text-right font-medium text-textMain">{value}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-card border border-primary/15 bg-white p-4 shadow-card">
        <div className="flex items-center gap-2"><Database className="size-4 text-primary" /><h3 className="text-[13px] font-semibold">已选数据源 <span className="text-primary">({selectedSources.length})</span></h3><button type="button" onClick={() => onEditStep?.(2)} className="ml-auto text-[10px] font-medium text-primary hover:underline">管理数据源 &gt;</button></div>
        <div className="mt-3 space-y-2">
          {selectedSources.length ? selectedSources.map((source) => <div key={source.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-borderSoft bg-slate-50 px-2.5 py-2"><span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary"><Database className="size-4" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{source.name}</p><p className="mt-0.5 truncate text-[9px] text-textMuted" title={source.url}>{source.url || "内部目录 / 文件源"}</p></div><div className="text-right"><span className="rounded bg-success-soft px-1.5 py-0.5 text-[9px] text-success">可用</span><p className="mt-1 text-[9px] font-semibold text-success">健康度 {source.confidenceLevel}</p></div></div>) : <p className="rounded-lg border border-dashed border-borderSoft p-3 text-center text-[11px] text-textMuted">尚未选择数据源</p>}
        </div>
      </section>

      <section className="rounded-card border border-ai-border bg-ai-soft/55 p-4 shadow-card">
        <div className="flex items-center gap-2"><Bot className="size-4 text-ai" /><h3 className="text-[13px] font-semibold text-ai">将使用的采集方式 <span>({selectedMethods.length})</span></h3><button type="button" onClick={() => onEditStep?.(3)} className="ml-auto text-[10px] font-medium text-ai hover:underline">管理采集方式 &gt;</button></div>
        <div className="mt-3 space-y-2">
          {selectedMethods.length ? selectedMethods.map((method) => <div key={method.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-ai-border bg-white px-2.5 py-2"><span className="flex size-8 items-center justify-center rounded-md bg-ai-soft text-ai"><Bot className="size-4" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-textMain">{method.name}</p><p className="mt-0.5 text-[9px] text-textMuted">解析 {method.parseTarget} · 去重与标准化</p></div><div className="text-right"><span className="rounded bg-primary-soft px-1.5 py-0.5 text-[9px] text-primary">启用</span><p className="mt-1 text-[9px] text-textMuted">AI解析：{method.aiEnabled ? "是" : "否"}</p></div></div>) : <span className="text-[11px] text-ai/70">尚未选择采集方式</span>}
        </div>
      </section>

      <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
        <div className="flex items-center gap-2"><UserCheck className="size-4 text-success" /><h3 className="text-[13px] font-semibold">数据流向</h3></div>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-1 overflow-x-auto text-[9px] font-medium text-textMain">
          {["数据源", "数据采集", "AI解析", "人工审核", "设备资料库"].map((item, index, all) => <div key={item} className="contents"><span className="flex min-w-[48px] flex-col items-center gap-1 text-center"><span className={cn("flex size-7 items-center justify-center rounded-full", index === 0 ? "bg-primary-soft text-primary" : index === 1 ? "bg-success-soft text-success" : index === 2 ? "bg-ai-soft text-ai" : index === 3 ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}>{index + 1}</span>{item}</span>{index < all.length - 1 ? <ArrowRight className="size-3 shrink-0 text-textMuted" /> : null}</div>)}
        </div>
      </section>

      {!draft.autoReviewRequired ? <section className="rounded-card border border-warning/25 bg-warning-soft p-3 text-[11px] leading-5 text-warning"><div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p><b>风险提示：</b>当前已关闭自动进入人工审核，AI解析结果可能在确认前缺少商务与技术复核。</p></div></section> : null}
    </aside>
  );
}
