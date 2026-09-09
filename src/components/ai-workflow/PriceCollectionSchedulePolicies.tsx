"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceCollectionSchedulePolicyRecord, PriceCollectionTaskRecord } from "@/types/priceCollection";

const frequencies = ["每小时", "每天", "每周", "每月"] as const;

type PriceCollectionSchedulePoliciesProps = {
  tasks: PriceCollectionTaskRecord[];
  onApplied?: () => void;
};

function formatNextRun(value: string) {
  if (!value) return "尚未排期";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function PriceCollectionSchedulePolicies({ tasks, onApplied }: PriceCollectionSchedulePoliciesProps) {
  const [policies, setPolicies] = useState<PriceCollectionSchedulePolicyRecord[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "danger">("success");
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/price-collection?view=schedule_policies", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as {
          policies?: PriceCollectionSchedulePolicyRecord[];
          canWrite?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "周期策略加载失败");
        if (cancelled) return;
        setPolicies(payload.policies ?? []);
        setCanWrite(Boolean(payload.canWrite));
        setDirtyIds([]);
        setMessage("");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setMessageTone("danger");
        setMessage(reason instanceof Error ? reason.message : "周期策略加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFrequency = (id: string, frequency: PriceCollectionSchedulePolicyRecord["frequency"]) => {
    setPolicies((current) => current.map((policy) => policy.id === id ? { ...policy, frequency } : policy));
    setDirtyIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const toggleActive = (id: string) => {
    setPolicies((current) => current.map((policy) => policy.id === id ? { ...policy, isActive: !policy.isActive } : policy));
    setDirtyIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const save = async (policy: PriceCollectionSchedulePolicyRecord) => {
    setSavingId(policy.id);
    setMessage("");
    try {
      const response = await fetch("/api/price-collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "schedule_policy",
          action: "apply",
          id: policy.id,
          frequency: policy.frequency,
          isActive: policy.isActive,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { policy?: PriceCollectionSchedulePolicyRecord; error?: string };
      if (!response.ok || !payload.policy) throw new Error(payload.error || "周期策略保存失败");
      setPolicies((current) => current.map((item) => item.id === policy.id ? payload.policy as PriceCollectionSchedulePolicyRecord : item));
      setDirtyIds((current) => current.filter((id) => id !== policy.id));
      setMessageTone("success");
      setMessage(policy.isActive ? `${policy.categoryLabel} 已应用到同品类周期任务` : `${policy.categoryLabel} 周期策略已停用`);
      onApplied?.();
    } catch (reason) {
      setMessageTone("danger");
      setMessage(reason instanceof Error ? reason.message : "周期策略保存失败");
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-white text-primary"><CalendarClock className="size-4" /></span>
          <div className="min-w-0"><h3 className="text-[13px] font-black text-textMain">品类采集周期</h3><p className="mt-0.5 text-[11px] leading-4 text-textMuted">策略决定同品类任务的默认频率；实际任务数量单独统计。</p></div>
        </div>
        <div className="shrink-0 text-right text-[10px] text-textMuted"><span className="block">策略启用 <strong className="text-textMain">{policies.filter((policy) => policy.isActive).length}</strong></span><span className="mt-0.5 block">实际周期任务 <strong className="text-primary">{tasks.filter((task) => task.scheduleEnabled).length}</strong></span></div>
      </div>
      {loading ? <div className="flex h-24 items-center justify-center text-textMuted"><Loader2 className="size-5 animate-spin" /></div> : (
        <div className="mt-3 overflow-hidden rounded-md border border-borderSoft bg-white">
          {policies.map((policy) => {
            const linkedTasks = tasks.filter((task) => task.scheduleEnabled && task.scheduleCategory === policy.categoryKey);
            const nextRunAt = linkedTasks.map((task) => task.nextRunAt).filter(Boolean).sort()[0] || "";
            const dirty = dirtyIds.includes(policy.id);
            return (
            <div key={policy.id} className={cn("grid grid-cols-[minmax(0,1fr)_104px_48px_82px] items-center gap-2 border-b border-borderSoft p-2.5 last:border-b-0", policy.isActive ? "bg-white" : "bg-slate-50")}>
              <div className="min-w-0"><div className="flex items-center gap-1.5"><strong className="truncate text-[11px] text-textMain" title={policy.categoryLabel}>{policy.categoryLabel}</strong><span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", policy.targetType === "material" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{policy.targetType === "material" ? "地材" : "设备"}</span><span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", policy.isActive ? "bg-success/10 text-success" : "bg-slate-200 text-textMuted")}>{policy.isActive ? "策略启用" : "策略停用"}</span></div><p className="mt-1 truncate text-[9px] text-textMuted">{linkedTasks.length ? `关联 ${linkedTasks.length} 个周期任务 · 下次 ${formatNextRun(nextRunAt)}` : "暂无实际周期任务"}</p></div>
                <select value={policy.frequency} disabled={!canWrite || savingId === policy.id} onChange={(event) => updateFrequency(policy.id, event.target.value as PriceCollectionSchedulePolicyRecord["frequency"])} className="h-8 min-w-0 flex-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] outline-none focus:border-primary disabled:opacity-50">
                  {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                </select>
                <button type="button" aria-pressed={policy.isActive} title={policy.isActive ? "停用该品类策略" : "启用该品类策略"} disabled={!canWrite || savingId === policy.id} onClick={() => toggleActive(policy.id)} className={cn("h-8 rounded-md border text-[10px] font-bold disabled:opacity-50", policy.isActive ? "border-warning/25 bg-warning/10 text-warning" : "border-success/25 bg-success/10 text-success")}>{policy.isActive ? "停用" : "启用"}</button>
                <button type="button" title={dirty ? "保存并应用更改" : "当前没有未保存更改"} disabled={!canWrite || savingId === policy.id || !dirty} onClick={() => void save(policy)} className="flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-2 text-[10px] font-bold text-white disabled:bg-slate-200 disabled:text-textMuted">{savingId === policy.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{dirty ? "保存更改" : "已保存"}</button>
            </div>
          );})}
        </div>
      )}
      {message ? <p role="status" className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-semibold", messageTone === "danger" ? "text-danger" : "text-textSecondary")}><ShieldCheck className={cn("size-3.5", messageTone === "danger" ? "text-danger" : "text-success")} />{message}</p> : null}
    </section>
  );
}
