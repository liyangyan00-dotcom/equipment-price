"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2X2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { ModuleHeader } from "@/components/common";
import type { CoveragePlan, buildCoverage } from "@/lib/priceCollection/coverage";

type Payload = {
  plan: CoveragePlan | null; coverage: ReturnType<typeof buildCoverage> | null;
  projects: { id: string; name: string; project_code: string }[];
  version: string; canWrite: boolean;
};
const field = "h-9 w-full min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[12px]";
const button = "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-borderSoft px-2 text-[11px] font-semibold disabled:opacity-40";

export function CollectionCoveragePanel({ taskId }: { taskId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<CoveragePlan>({ projectId: "", from: "", to: "", targets: [] });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const endpoint = `/api/price-collection/tasks/${encodeURIComponent(taskId)}/coverage`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "读取失败");
        if (controller.signal.aborted) return;
        setData(payload);
        setDraft(payload.plan || { projectId: "", from: "", to: "", targets: [{ name: "", specification: "", region: "" }] });
        setEditing(!payload.plan);
        setPage(1);
        setSelectedIds([]); setSelectedId("");
      } catch (error) {
        if (!controller.signal.aborted) { setData(null); setError(error instanceof Error ? error.message : "读取失败"); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, revision]);
  async function save() {
    if (!data || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: draft, version: data.version }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setMessage("覆盖计划与项目关联已保存");
      setRevision((value) => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  }
  const coverage = data?.coverage;
  const pages = Math.max(1, Math.ceil((coverage?.cells.length || 0) / 20));
  const project = data?.projects.find((project) => project.id === data.plan?.projectId);
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
      <div className="p-4"><ModuleHeader icon={Grid2X2} title="采集覆盖与项目关联" action={<button className={button} title="刷新覆盖统计" aria-label="刷新覆盖统计" disabled={loading || saving} onClick={() => { setMessage(""); setRevision((value) => value + 1); }}><RefreshCw className="size-4" /></button>} /></div>
      {error ? <p role="alert" className="px-4 pb-3 text-[12px] text-danger">{error}</p> : null}
      {message ? <p role="status" className="px-4 pb-3 text-[12px] text-success">{message}</p> : null}
      {loading ? <p role="status" className="p-4 text-[12px] text-textMuted">正在读取覆盖数据…</p> : data ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-borderSoft px-4 py-3 text-[12px]">
          {project ? <Link className="min-w-0 truncate font-semibold text-primary" title={project.name} href={`/project-pricing?projectId=${encodeURIComponent(project.id)}`}>{project.project_code} · {project.name}</Link> : <span className="text-textMuted">{data.plan?.projectId ? "关联项目不可用" : "未关联项目"}</span>}
          {data.canWrite ? <button className={button} disabled={saving} onClick={() => { setDraft(data.plan || draft); setEditing(!editing); }}>{editing ? "收起设置" : "修改覆盖计划"}</button> : null}
        </div>
        {editing && data.canWrite ? <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-3 p-4">
          <label className="grid gap-1 text-[11px] text-textSecondary">关联项目<select className={field} value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}><option value="">不关联</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} · {project.name}</option>)}</select></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] text-textSecondary">覆盖开始月<input type="month" required className={field} value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label>
            <label className="grid gap-1 text-[11px] text-textSecondary">覆盖结束月<input type="month" required className={field} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
          </div>
          {draft.targets.map((target, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_32px] items-end gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_32px]">
            {([['name', '名称'], ['specification', '规格'], ['region', '地区']] as const).map(([key, label]) => <label key={key} className="col-start-1 grid min-w-0 gap-1 text-[11px] text-textSecondary sm:col-start-auto">{label}<input required maxLength={200} className={field} value={target[key]} onChange={(event) => setDraft({ ...draft, targets: draft.targets.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row) })} /></label>)}
            <button type="button" className={button} aria-label={`删除覆盖对象 ${index + 1}`} title="删除覆盖对象" disabled={draft.targets.length === 1} onClick={() => setDraft({ ...draft, targets: draft.targets.filter((_, rowIndex) => rowIndex !== index) })}><Trash2 className="size-4" /></button>
          </div>)}
          <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={draft.targets.length >= 100 || saving} onClick={() => setDraft({ ...draft, targets: [...draft.targets, { name: "", specification: "", region: "" }] })}><Plus className="size-4" />覆盖对象</button><button className={`${button} bg-primary text-white`} disabled={saving}><Save className="size-4" />{saving ? "保存中" : "保存计划"}</button></div>
        </form> : null}
        {coverage ? <>
          <dl className="grid grid-cols-2 gap-3 p-4 text-[12px] sm:grid-cols-4">{[["目标组合", coverage.total], ["已采集组合", coverage.collected], ["已审核组合", coverage.reviewed], ["日期待核查线索", coverage.unknownDate]].map(([label, value]) => <div key={label}><dt className="text-textMuted">{label}</dt><dd className="mt-1 text-[16px] font-bold">{value}</dd></div>)}</dl>
          <div className="overflow-x-auto"><table className="w-full min-w-[880px] table-fixed whitespace-nowrap text-left text-[11px]"><thead className="bg-slate-50"><tr>{["月份", "名称", "规格", "地区", "采集状态", "待审核", "已审核", "已转库", "异常 / 退回"].map((label) => <th key={label} className="h-9 px-3">{label}</th>)}</tr></thead><tbody>{coverage.cells.slice((page - 1) * 20, page * 20).map((cell, index) => <tr key={`${page}-${index}`} className="h-10 border-t border-borderSoft">
            {[cell.month, cell.name, cell.specification, cell.region, cell.collected ? `${cell.collected} 条` : "缺口待核查", cell.pending, cell.ready, cell.transferred, `${cell.incomplete} / ${cell.rejected}`].map((value, column) => <td key={column} className={`truncate px-3 ${column === 4 && !cell.collected ? "text-warning" : ""}`} title={String(value)}>{column === 4 && cell.leadIds.length ? <button className="text-primary" onClick={() => { setSelectedIds(cell.leadIds); setSelectedId(cell.leadIds[0]); }}>{value}</button> : value}</td>)}
          </tr>)}</tbody></table></div>
          {selectedIds.length ? <div className="flex flex-wrap items-end gap-2 border-t border-borderSoft p-3"><label className="grid min-w-0 flex-1 gap-1 text-[11px]">关联线索（{selectedIds.length} 条）<select className={field} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{selectedIds.map((id, index) => <option key={id} value={id}>线索 {index + 1} · {id}</option>)}</select></label><Link className={`${button} text-primary`} href={`/price-leads?leadId=${encodeURIComponent(selectedId)}`}>查看证据与审核</Link></div> : null}
          <div className="flex items-center justify-between gap-2 border-t border-borderSoft p-3 text-[11px]"><span>共 {coverage.total} 组 · 第 {page} / {pages} 页</span><div className="flex gap-2"><button className={button} aria-label="上一页覆盖结果" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></button><button className={button} aria-label="下一页覆盖结果" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></button></div></div>
          <p className="border-t border-borderSoft px-4 py-3 text-[11px] text-textMuted">组织内同类线索 · 按报价月份、名称、规格和地区匹配 · 未知日期不计入月份覆盖 · 缺口原因待核查 · 项目关联不代表已采用价格</p>
        </> : <p className="p-4 text-[12px] text-textMuted">尚未设定覆盖目标，暂无覆盖率。</p>}
      </> : null}
    </section>
  );
}
