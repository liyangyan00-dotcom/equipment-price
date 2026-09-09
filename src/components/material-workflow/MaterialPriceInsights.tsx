"use client";

import Link from "next/link";
import { Activity, MapPinned, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import type { MaterialPriceRecord } from "@/data/mock/materialPrices";
import { materialInsights, materialTrend } from "@/lib/data/materialInsights";

type Props = { records: MaterialPriceRecord[]; activeRecord?: MaterialPriceRecord };
const panel = "min-w-0 rounded-lg border border-borderSoft bg-white p-4 shadow-card";
const empty = "py-8 text-center text-xs text-textSecondary";

function Distribution({ data, total }: { data: Array<{ label: string; count: number }>; total: number }) {
  return <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
    {data.length === 0 ? <p className={empty}>暂无统计样本</p> : data.map(item => <div key={item.label}>
      <div className="flex min-w-0 justify-between gap-3 text-xs"><span className="truncate" title={item.label}>{item.label}</span><span className="shrink-0 tabular-nums">{item.count} 条</span></div>
      <div className="mt-1 h-1.5 bg-slate-100"><div className="h-full bg-teal-500" style={{ width: `${total ? item.count / total * 100 : 0}%` }} /></div>
    </div>)}
  </div>;
}

export function MaterialCollectionSuggestions({ records }: Props) {
  const { issues } = materialInsights(records);
  return <aside className={panel}>
    <ModuleHeader icon={Sparkles} tone="purple" title="AI补充采集" subtitle={`规则检查 · ${issues.length} 条待补充或复核`} />
    <div className="mt-3 space-y-3">
      {issues.length === 0 ? <p className={empty}>当前样本未发现上述资料缺口</p> : issues.slice(0, 5).map(({ row, issues: reasons }) => <div key={row.id} className="border-b border-borderSoft pb-3">
        <Link href={`/material-prices/${encodeURIComponent(row.id)}`} className="block truncate text-sm font-semibold text-primary" title={`${row.materialName} ${row.specification}`}>{row.materialName} {row.specification}</Link>
        <p className="mt-1 break-words text-xs text-amber-700">{reasons.join("、")}</p>
        <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ai" href={`/ai-price-collection?target=material&keyword=${encodeURIComponent(row.materialName)}&source=material-prices`}><Sparkles className="h-3.5 w-3.5" />创建补充采集</Link>
      </div>)}
    </div>
    <Link href="/price-leads?type=地材" className="mt-4 block text-xs font-semibold text-primary">进入地材线索池</Link>
  </aside>;
}

export function MaterialPriceInsights({ records, activeRecord }: Props) {
  const result = materialInsights(records);
  const trend = materialTrend(records, activeRecord);
  const first = trend[0]?.price;
  const last = trend.at(-1)?.price;
  const change = trend.length >= 2 && first && last ? (last / first - 1) * 100 : null;
  const prices = trend.map(point => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const timestamps = trend.map(point => Date.parse(`${point.date}T00:00:00Z`));
  const duration = timestamps.at(-1)! - timestamps[0];
  const points = trend.map((point, index) => `${20 + (timestamps[index] - timestamps[0]) / (duration || 1) * 260},${100 - (point.price - min) / (max - min || 1) * 70}`).join(" ");
  return <section aria-label="地材样本分析" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className={panel}><ModuleHeader icon={Activity} title="价格来源分布" subtitle={`当前筛选已加载 ${records.length} 条`} /><Distribution data={result.sources} total={records.length} /></div>
    <div className={panel}>
      <ModuleHeader icon={TrendingUp} title="同口径价格趋势" subtitle={activeRecord ? `${activeRecord.materialName} · ${activeRecord.currency}/${activeRecord.unit}` : "未选择价格"} />
      {change == null ? <p className={empty}>价格条件不完整或不足两个可比报价日期，暂不判断涨跌</p> : <>
        <p className="mt-3 text-lg font-semibold tabular-nums">{change > 0 ? "+" : ""}{change.toFixed(1)}%</p>
        <p className="mt-1 break-words text-xs text-textSecondary">{first?.toLocaleString()} 至 {last?.toLocaleString()} {activeRecord?.currency}/{activeRecord?.unit}</p>
        <svg role="img" aria-label="同规格、单位、币种、地区、来源、供应商、税费和运输条件的报价中位数趋势" viewBox="0 0 300 120" className="mt-2 h-32 w-full"><polyline points={points} fill="none" stroke="#0d9488" strokeWidth="3" /></svg>
        <p className="text-xs text-textSecondary">{trend[0].date} 至 {trend.at(-1)?.date} · 原币报价中位数 · {trend.reduce((sum, point) => sum + point.count, 0)} 条</p>
      </>}
      <Link href="/analytics?range=30&objectType=material" className="mt-3 block text-xs font-semibold text-primary">查看统计分析</Link>
    </div>
    <div className={panel}><ModuleHeader icon={MapPinned} title="地区样本分布" subtitle="记录数量，不代表地区价格高低" /><Distribution data={result.regions} total={records.length} /><Link href="/analytics?range=30&objectType=material" className="mt-3 block text-xs font-semibold text-primary">进入地区分析</Link></div>
    <div className={panel}><ModuleHeader icon={TriangleAlert} tone="orange" title="资料与风险复核" subtitle="规则检查，不替代人工商务判断" />
      <dl className="mt-4 space-y-3 text-xs">{[["待补充或复核", result.issues.length], ["高风险 / 严重风险", result.highRisk], ["报价日期缺失或异常", result.unknownDate], ["未来报价日期", result.futureDate]].map(([label, count]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="shrink-0 font-semibold text-amber-700">{count} 条</dd></div>)}</dl>
      <Link href="/material-prices/reviews" className="mt-4 block text-xs font-semibold text-primary">进入人工审核</Link>
    </div>
  </section>;
}
