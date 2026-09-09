"use client";

import { useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";

type Option = { id: string; supplier_code: string; name: string; country_code: string | null; review_status: string | null };
type Result = { data: Option[]; selected: Option | null; pagination: { page: number; pageSize: number; total: number; pageCount: number } };
const control = "h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary";

export function SupplierPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const id = useId();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; payload?: Result; error?: string }>({ key: "" });
  const params = new URLSearchParams({ q: keyword.trim(), page: String(page), selectedId: value });
  const url = `/api/suppliers/options?${params}`;
  const key = `${url}|${retry}`;
  const loading = result.key !== key;
  const payload = !loading && !result.error ? result.payload : undefined;
  const selected = payload?.selected;
  const options = payload ? [...(selected && !payload.data.some(row => row.id === selected.id) ? [selected] : []), ...payload.data] : [];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "登录已失效，请重新登录" : response.status === 403 ? "没有供应商访问权限" : "供应商读取失败，请重试");
        const data = await response.json() as Result;
        const valid = (row: Option) => row && typeof row.id === "string" && typeof row.name === "string" && typeof row.supplier_code === "string";
        if (!Array.isArray(data.data) || !data.data.every(valid) || data.data.length > 50
          || !data.pagination || data.pagination.pageSize !== 50 || data.pagination.page !== page
          || !Number.isSafeInteger(data.pagination.total) || data.pagination.total < data.data.length
          || new Set(data.data.map(row => row.id)).size !== data.data.length
          || data.data.length !== Math.max(0, Math.min(50, data.pagination.total - (page - 1) * 50))
          || data.pagination.pageCount !== Math.max(1, Math.ceil(data.pagination.total / 50))
          || (data.selected !== null && (!valid(data.selected) || data.selected.id !== value))) throw new Error("供应商响应异常，请重试");
        if (!controller.signal.aborted) {
          if (page > data.pagination.pageCount) { setPage(data.pagination.pageCount); return; }
          setResult({ key, payload: data });
        }
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "供应商读取失败" });
      }
    }, keyword ? 350 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, url, keyword, page, value]);

  return <div className="space-y-3">
    <label htmlFor={`${id}-search`} className="block text-[12px] font-semibold text-textSecondary">供应商检索</label>
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" /><input id={`${id}-search`} className={`${control} pl-9`} value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1); }} placeholder="输入供应商名称或编号" /></div>
    <label htmlFor={`${id}-select`} className="block text-[12px] font-semibold text-textSecondary">关联供应商 <span className="text-danger">*</span></label>
    <select id={`${id}-select`} className={control} value={value} disabled={loading || Boolean(result.error)} onChange={event => onChange(event.target.value)}>
      <option value="">{loading ? "正在读取供应商..." : "请选择供应商"}</option>
      {value && !options.some(row => row.id === value) ? <option value={value}>{loading ? "正在读取已选供应商..." : "已选供应商不可用，请重新选择"}</option> : null}
      {options.map(row => <option key={row.id} value={row.id}>{row.supplier_code} · {row.name}</option>)}
    </select>
    {!loading && result.error ? <div role="alert" className="flex items-center justify-between gap-2 text-xs text-danger"><span>{result.error}</span><button type="button" aria-label="重试供应商查询" title="重试供应商查询" onClick={() => setRetry(n => n + 1)}><RotateCcw className="size-4" /></button></div> : null}
    {payload ? <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-textMuted"><span>共 {payload.pagination.total} 条 · 第 {page} / {payload.pagination.pageCount} 页</span><div className="flex gap-1"><button type="button" title="上一页供应商" aria-label="上一页供应商" disabled={page <= 1} onClick={() => setPage(n => n - 1)} className="size-8 rounded-md border border-borderSoft disabled:opacity-40"><ChevronLeft className="mx-auto size-4" /></button><button type="button" title="下一页供应商" aria-label="下一页供应商" disabled={page >= payload.pagination.pageCount} onClick={() => setPage(n => n + 1)} className="size-8 rounded-md border border-borderSoft disabled:opacity-40"><ChevronRight className="mx-auto size-4" /></button></div></div> : null}
    {selected ? <div className="rounded-md border border-primary/15 bg-primary-soft p-3"><p className="text-[12px] font-semibold text-primary">{selected.name}</p><p className="mt-1 text-[10px] text-textMuted">{selected.supplier_code} · {selected.country_code || "地区待补全"} · 主体状态 {selected.review_status || "待审核"}</p></div> : null}
  </div>;
}
