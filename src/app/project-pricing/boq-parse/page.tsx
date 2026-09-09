"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, FileSpreadsheet, LoaderCircle, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleHeader, PriceCell } from "@/components/common";
import { useToast } from "@/hooks/useToast";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { cn } from "@/lib/utils";

type Item = {
  id: string; project_id: string; boq_code: string; line_no: number; item_name: string; specification: string;
  category: "equipment" | "material" | "service"; quantity: number; unit: string; matched_unit_price: number | null;
  currency: string; price_source_type: string; source_legacy_id: string | null; confidence: number;
  match_level: "exact" | "similar" | "type" | "model" | "unmatched"; risk_level: "low" | "medium" | "high" | "critical";
  needs_inquiry: boolean; decision_status: "gap" | "ai_recommended" | "manual_selected" | "confirmed";
  evidence_count: number; notes: string; supplier?: { name?: string } | null;
};
type Payload = {
  project: { id: string; project_code: string; name: string; status: string; updated_at: string };
  items: Item[];
  summary: { totalItems: number; matchedItems: number; gapItems: number; highRiskItems: number; totalUsd: number; confirmedUsd: number; averageConfidence: number };
};

function errorMessage(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}

function ManualReviewDialog({ item, projectId, onClose, onSaved }: { item: Item; projectId: string; onClose: () => void; onSaved: (payload: Payload) => void }) {
  const toast = useToast();
  const dialogRef = useDialogFocusTrap<HTMLDivElement>(onClose);
  const [unitPrice, setUnitPrice] = useState(item.matched_unit_price?.toString() ?? "");
  const [normalizedUsdPrice, setNormalizedUsdPrice] = useState("");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = item.currency.toUpperCase();
  const price = Number(unitPrice);
  const usdPrice = currency === "USD" ? price : Number(normalizedUsdPrice);
  const valid = unitPrice.trim() !== ""
    && Number.isFinite(price)
    && price >= 0
    && (currency === "USD" || normalizedUsdPrice.trim() !== "")
    && Number.isFinite(usdPrice)
    && usdPrice >= 0
    && Boolean(notes.trim());

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/project-pricing/${projectId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitPrice: price, currency, normalizedUsdPrice: usdPrice, notes: notes.trim(), confirm: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "人工价格保存失败"));
      onSaved(payload.data);
      toast.success("人工价格已保存", "该行已标记为人工确认，并保留价格依据和审计记录。 ");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "人工价格保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="manual-review-title" aria-describedby="manual-review-description">
      <section className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft p-5">
          <div className="min-w-0"><h2 id="manual-review-title" className="text-[17px] font-bold text-textMain">人工核验价格</h2><p id="manual-review-description" className="mt-1 truncate text-[11px] text-textMuted">{item.boq_code} · {item.item_name} · {item.specification || "无规格"}</p></div>
          <button type="button" aria-label="关闭人工核验" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-ai-border bg-ai-soft p-3 text-[11px]"><div><p className="text-textMuted">AI 可信度</p><p className="mt-1 text-[18px] font-bold text-ai">{item.confidence}%</p></div><div><p className="text-textMuted">当前风险</p><p className="mt-1 text-[15px] font-bold text-warning">{item.risk_level}</p></div></div>
          <label className="block text-[12px] font-bold text-textSecondary">原币单价（{currency}）<input data-dialog-initial-focus type="number" min="0" step="any" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25" /></label>
          {currency !== "USD" ? <label className="block text-[12px] font-bold text-textSecondary">USD 折算单价 <span className="text-danger">*</span><input type="number" min="0" step="any" value={normalizedUsdPrice} onChange={(event) => setNormalizedUsdPrice(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25" /><span className="mt-1 block text-[10px] font-normal text-textMuted">请按当前项目确认的汇率口径折算，系统不会自动猜测。</span></label> : null}
          <label className="block text-[12px] font-bold text-textSecondary">核验说明 <span className="text-danger">*</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} placeholder="填写价格依据、汇率口径和证据来源" className="mt-1 w-full resize-none rounded-md border border-borderSoft p-3 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25" /></label>
          <div className="rounded-md border border-warning/25 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary"><strong className="text-warning">人工确认边界：</strong>保存会写入数据库并保留审计记录，但不替代最终商务审批。</div>
          {error ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[11px] font-semibold text-danger">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={onClose} className="h-10 rounded-md border border-borderSoft px-4 text-[12px] font-semibold">取消</button><button type="button" disabled={!valid || busy} onClick={() => void submit()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{busy ? "保存中" : "确认并保存"}</button></footer>
      </section>
    </div>
  );
}

function BoqParseContent() {
  const params = useSearchParams();
  const toast = useToast();
  const projectId = params.get("projectId") || params.get("pricingId") || params.get("id") || "";
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [match, setMatch] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [manualReviewItem, setManualReviewItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(projectId ? `/api/project-pricing/${projectId}` : "/api/project-pricing", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "BOQ 解析结果加载失败"));
      if (!payload.data) throw new Error("尚未上传 BOQ，请先在项目套价中心上传文件");
      setData(payload.data);
      setSelectedId((current) => current || payload.data.items[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BOQ 解析结果加载失败");
    } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const rows = useMemo(() => (data?.items ?? []).filter((item) => {
    const text = `${item.boq_code} ${item.item_name} ${item.specification}`.toLowerCase();
    return (!keyword.trim() || text.includes(keyword.trim().toLowerCase()))
      && (category === "all" || item.category === category)
      && (match === "all" || item.match_level === match);
  }), [category, data?.items, keyword, match]);
  const selected = data?.items.find((item) => item.id === selectedId) ?? rows[0];

  async function autoPrice() {
    if (!data || busy) return; setBusy(true);
    try {
      const response = await fetch(`/api/project-pricing/${data.project.id}/auto-price`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "自动套价失败"));
      setData(payload.data); toast.success("自动套价完成", "匹配结果已写入项目明细，仍需人工确认。 ");
    } catch (reason) { toast.warning("自动套价失败", reason instanceof Error ? reason.message : "请稍后重试"); }
    finally { setBusy(false); }
  }

  return <AppLayout><div className="space-y-3">
    <PageHeader title="BOQ 解析与套价核验" description="读取真实项目行项目，核对解析结果、价格匹配、风险与证据后进入人工确认。" actions={<div className="flex gap-2"><Link href={data ? `/project-pricing?view=workspace&projectId=${data.project.id}` : "/project-pricing?view=projects"} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold"><ArrowLeft className="size-4" />返回套价工作台</Link><button onClick={() => void load()} className="inline-flex size-11 items-center justify-center rounded-md border border-borderSoft bg-white" title="刷新"><RefreshCw className="size-4" /></button></div>} />
    {loading ? <section className="flex min-h-72 items-center justify-center rounded-card border border-borderSoft bg-white"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="ml-2 text-[13px] text-textMuted">正在读取真实 BOQ 数据...</span></section>
      : error ? <section className="flex min-h-72 flex-col items-center justify-center rounded-card border border-danger/20 bg-white text-center"><AlertTriangle className="size-9 text-danger" /><p className="mt-3 text-[15px] font-bold">{error}</p><Link href="/project-pricing" className="mt-4 rounded-md bg-primary px-4 py-2 text-[13px] font-bold text-white">前往上传 BOQ</Link></section>
      : data ? <>
        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[15px] font-bold">{data.project.name}</p><p className="mt-1 text-[11px] text-textMuted">{data.project.project_code} · 最近更新 {new Date(data.project.updated_at).toLocaleString("zh-CN", { hour12: false })}</p></div><button onClick={autoPrice} disabled={busy || !data.items.length} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ai px-4 text-[13px] font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}重新自动套价</button></div></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
          ["解析行项目", data.summary.totalItems, FileSpreadsheet, "text-primary"], ["已匹配价格", data.summary.matchedItems, CheckCircle2, "text-success"], ["询价缺口", data.summary.gapItems, AlertTriangle, "text-warning"], ["高风险项", data.summary.highRiskItems, AlertTriangle, "text-danger"], ["平均可信度", `${data.summary.averageConfidence}%`, Database, "text-ai"],
        ].map(([label, value, Icon, tone]) => { const KpiIcon = Icon as typeof Database; return <div key={String(label)} className="rounded-card border border-borderSoft bg-white p-3 shadow-card"><KpiIcon className={cn("size-5", tone)} /><p className="mt-3 text-[11px] text-textMuted">{String(label)}</p><p className="mt-1 text-[22px] font-bold tabular-nums">{String(value)}</p></div>; })}</section>
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="border-b border-borderSoft p-3"><ModuleHeader icon={FileSpreadsheet} title="真实解析明细" subtitle={`${rows.length} / ${data.items.length} 行，点击行查看核验信息`} tone="blue" density="compact" /><div className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_150px_auto]"><label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft px-3"><Search className="size-4 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="名称、规格或 BOQ 编号" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-md border border-borderSoft px-2 text-[12px]"><option value="all">全部分类</option><option value="equipment">设备</option><option value="material">地材</option><option value="service">服务</option></select><select value={match} onChange={(event) => setMatch(event.target.value)} className="h-9 rounded-md border border-borderSoft px-2 text-[12px]"><option value="all">全部匹配</option><option value="exact">精准匹配</option><option value="similar">相似匹配</option><option value="model">型号匹配</option><option value="type">类型匹配</option><option value="unmatched">未匹配</option></select><button onClick={() => { setKeyword(""); setCategory("all"); setMatch("all"); }} className="min-h-11 rounded-md border border-borderSoft px-3 text-[12px] font-semibold">清空</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-[12px]"><thead className="h-10 bg-slate-50 text-textSecondary"><tr><th className="px-3">BOQ编号</th><th className="px-3">名称</th><th className="px-3">规格</th><th className="px-3">数量/单位</th><th className="px-3">匹配价格</th><th className="px-3">来源</th><th className="px-3">可信度</th><th className="px-3">状态</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={cn("h-12 cursor-pointer border-t border-borderSoft hover:bg-primary-soft/30", selected?.id === item.id && "bg-primary-soft/55")}><td className="whitespace-nowrap px-3 font-bold text-primary"><button type="button" aria-label={`选择 ${item.item_name}`} aria-pressed={selected?.id === item.id} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }} className="inline-flex min-h-11 items-center rounded-sm text-left font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{item.boq_code}</button></td><td className="max-w-44 truncate px-3 font-semibold" title={item.item_name}>{item.item_name}</td><td className="max-w-56 truncate px-3" title={item.specification}>{item.specification || "-"}</td><td className="whitespace-nowrap px-3">{item.quantity} {item.unit}</td><td className="whitespace-nowrap px-3">{item.matched_unit_price === null ? "-" : <PriceCell value={item.matched_unit_price} currency={item.currency} />}</td><td className="max-w-40 truncate px-3" title={item.source_legacy_id || item.price_source_type}>{item.source_legacy_id || item.price_source_type}</td><td className="px-3 font-bold text-ai">{item.confidence}%</td><td className="px-3"><span className={cn("whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold", item.decision_status === "confirmed" ? "bg-success-soft text-success" : item.needs_inquiry ? "bg-warning-soft text-warning" : "bg-ai-soft text-ai")}>{item.decision_status === "confirmed" ? "已确认" : item.needs_inquiry ? "需询价" : "待复核"}</span></td></tr>)}</tbody></table></div></section>
          <aside className="rounded-card border border-ai-border bg-white p-3 shadow-card"><ModuleHeader icon={Sparkles} title="人工核验工作区" subtitle="AI 结果不得直接替代商务判断" tone="purple" density="compact" />{selected ? <div className="mt-3 space-y-3"><div><p className="font-bold">{selected.item_name}</p><p className="mt-1 text-[11px] text-textMuted">{selected.boq_code} · {selected.specification || "无规格"}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-md bg-ai-soft p-2"><p className="text-[10px] text-textMuted">AI可信度</p><p className="mt-1 text-[20px] font-bold text-ai">{selected.confidence}%</p></div><div className="rounded-md bg-warning-soft p-2"><p className="text-[10px] text-textMuted">风险</p><p className="mt-1 text-[16px] font-bold text-warning">{selected.risk_level}</p></div></div><div className="rounded-md border border-borderSoft bg-slate-50 p-3 text-[11px] leading-5 text-textSecondary"><p>来源：{selected.source_legacy_id || selected.price_source_type}</p><p>供应商：{selected.supplier?.name || "待确认"}</p><p>证据：{selected.evidence_count} 条</p><p>备注：{selected.notes || "无"}</p></div><button onClick={() => setManualReviewItem(selected)} disabled={busy} className="min-h-11 w-full rounded-md bg-primary text-[12px] font-bold text-white disabled:opacity-50">人工核验价格</button>{selected.needs_inquiry ? <Link href={`/inquiries/create?source=project-pricing&pricingId=${data.project.id}&boqItemIds=${selected.id}`} className="flex min-h-11 items-center justify-center rounded-md border border-warning/30 bg-warning-soft text-[12px] font-bold text-warning">为该项创建询价</Link> : null}</div> : <p className="mt-3 text-[12px] text-textMuted">请选择一行数据。</p>}</aside>
        </div>
      </> : null}
    {manualReviewItem && data ? <ManualReviewDialog item={manualReviewItem} projectId={data.project.id} onClose={() => setManualReviewItem(null)} onSaved={setData} /> : null}
  </div></AppLayout>;
}

export default function BoqParsePage() { return <Suspense fallback={<div className="min-h-screen bg-page" />}><BoqParseContent /></Suspense>; }
