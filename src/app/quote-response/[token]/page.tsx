"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

type InquiryItem = {
  id: string;
  item_name: string;
  specification: string | null;
  quantity: number;
  unit: string | null;
};
type QuoteInput = {
  inquiryItemId: string;
  unitPrice: string;
  deliveryDays: string;
  validityDays: string;
  technicalDeviation: string;
  commercialDeviation: string;
};
type PortalData = {
  portal: { status: string; expiresAt: string };
  inquiry: { inquiry_code: string; subject: string; deadline: string | null; base_currency: string };
  supplier: { name: string; region: string | null };
  items: InquiryItem[];
  quotes: Array<{
    inquiry_item_id: string;
    unit_price: number;
    delivery_days: number | null;
    validity_days: number | null;
    technical_deviation: string | null;
    commercial_deviation: string | null;
    currency: string;
  }>;
};

export default function SupplierQuoteResponsePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<PortalData | null>(null);
  const [items, setItems] = useState<QuoteInput[]>([]);
  const [currency, setCurrency] = useState("CNY");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/public/quote-response/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: PortalData; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || "填报链接读取失败");
        return payload.data;
      })
      .then((next) => {
        if (!active) return;
        setData(next);
        setSubmitted(next.portal.status === "submitted");
        const existing = new Map(next.quotes.map((quote) => [quote.inquiry_item_id, quote]));
        setCurrency(next.quotes[0]?.currency || next.inquiry.base_currency || "CNY");
        setItems(next.items.map((item) => {
          const quote = existing.get(item.id);
          return {
            inquiryItemId: item.id,
            unitPrice: quote?.unit_price == null ? "" : String(quote.unit_price),
            deliveryDays: quote?.delivery_days == null ? "" : String(quote.delivery_days),
            validityDays: quote?.validity_days == null ? "30" : String(quote.validity_days),
            technicalDeviation: quote?.technical_deviation || "",
            commercialDeviation: quote?.commercial_deviation || "",
          };
        }));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "填报链接读取失败"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const total = useMemo(() => data?.items.reduce((sum, source, index) => {
    const price = Number(items[index]?.unitPrice || 0);
    return sum + (Number.isFinite(price) ? price * Number(source.quantity) : 0);
  }, 0) ?? 0, [data, items]);

  const updateItem = (index: number, field: keyof QuoteInput, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (items.some((item) => !item.unitPrice || Number(item.unitPrice) < 0)) {
      setError("请为每一个询价项目填写有效单价。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/public/quote-response/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            ...item,
            currency,
            unitPrice: Number(item.unitPrice),
            deliveryDays: item.deliveryDays ? Number(item.deliveryDays) : null,
            validityDays: item.validityDays ? Number(item.validityDays) : null,
          })),
          contactName,
          contactEmail,
          contactPhone,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "报价提交失败");
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "报价提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-page"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  if (error && !data) return <main className="flex min-h-screen items-center justify-center bg-page p-6"><section className="max-w-lg rounded-card border border-danger/20 bg-white p-8 text-center shadow-card"><AlertTriangle className="mx-auto size-10 text-danger" /><h1 className="mt-4 text-xl font-bold">报价链接不可用</h1><p className="mt-2 text-sm text-textMuted">{error}</p></section></main>;
  if (!data) return null;

  return (
    <main className="min-h-screen bg-page text-textMain">
      <header className="border-b border-borderSoft bg-primary-deep text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-white/12"><FileCheck2 className="size-5" /></div><div><b className="text-[16px]">水厂价格情报 · 供应商报价门户</b><p className="mt-0.5 text-[11px] text-blue-100/75">逐项报价、偏差说明与交期承诺将进入受控询价证据链</p></div></div>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/20 px-3 py-1.5 text-[11px]"><ShieldCheck className="size-3.5" />安全填报</span>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] space-y-4 px-5 py-5">
        <section className="grid gap-3 rounded-card border border-borderSoft bg-white p-4 shadow-card md:grid-cols-[minmax(0,1fr)_240px_240px]">
          <div><p className="text-[11px] text-textMuted">询价任务</p><h1 className="mt-1 text-xl font-bold">{data.inquiry.subject}</h1><p className="mt-1 text-[12px] text-primary">{data.inquiry.inquiry_code}</p></div>
          <div className="rounded-lg bg-primary-soft p-3"><div className="flex items-center gap-2 text-primary"><Building2 className="size-4" /><b className="text-[12px]">受邀供应商</b></div><p className="mt-2 text-[13px] font-bold">{data.supplier.name}</p><p className="mt-1 text-[11px] text-textMuted">{data.supplier.region || "地区待确认"}</p></div>
          <div className="rounded-lg bg-warning-soft p-3"><div className="flex items-center gap-2 text-warning"><CalendarClock className="size-4" /><b className="text-[12px]">截止与链接</b></div><p className="mt-2 text-[12px]">询价截止：{data.inquiry.deadline ? new Date(data.inquiry.deadline).toLocaleString("zh-CN") : "未设置"}</p><p className="mt-1 text-[11px] text-textMuted">链接失效：{new Date(data.portal.expiresAt).toLocaleString("zh-CN")}</p></div>
        </section>
        {submitted ? (
          <section className="rounded-card border border-success/25 bg-white p-10 text-center shadow-card"><CheckCircle2 className="mx-auto size-12 text-success" /><h2 className="mt-4 text-xl font-bold">报价已安全提交</h2><p className="mt-2 text-sm text-textMuted">采购团队将对价格、技术偏差、商务偏差和交期进行人工评审。此链接不能重复提交。</p></section>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft px-4 py-3"><div><h2 className="font-bold">逐项报价与偏差说明</h2><p className="mt-0.5 text-[11px] text-textMuted">所有项目均需报价；无偏差时可留空偏差说明。</p></div><label className="flex items-center gap-2 text-[12px] font-bold">报价币种<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="h-9 rounded-md border border-borderSoft bg-white px-3 font-normal"><option>CNY</option><option>USD</option><option>EUR</option><option>CDF</option></select></label></div>
              <div className="overflow-x-auto"><table className="min-w-[1180px] w-full text-[12px]"><thead className="bg-slate-50 text-left text-textSecondary"><tr><th className="px-3 py-2.5">项目</th><th className="px-3 py-2.5">数量</th><th className="px-3 py-2.5 text-right">单价</th><th className="px-3 py-2.5">交期(天)</th><th className="px-3 py-2.5">有效期(天)</th><th className="px-3 py-2.5">技术偏差</th><th className="px-3 py-2.5">商务偏差</th><th className="px-3 py-2.5 text-right">小计</th></tr></thead><tbody>{data.items.map((source, index) => <tr key={source.id} className="border-t border-borderSoft align-top"><td className="px-3 py-3"><b>{source.item_name}</b><p className="mt-1 max-w-[240px] text-[11px] text-textMuted">{source.specification || "规格待确认"}</p></td><td className="whitespace-nowrap px-3 py-3">{source.quantity} {source.unit || "项"}</td><td className="px-3 py-2"><input required type="number" min="0" step="0.01" value={items[index]?.unitPrice || ""} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} className="h-9 w-32 rounded-md border border-borderSoft px-2 text-right" /></td><td className="px-3 py-2"><input type="number" min="0" value={items[index]?.deliveryDays || ""} onChange={(event) => updateItem(index, "deliveryDays", event.target.value)} className="h-9 w-24 rounded-md border border-borderSoft px-2" /></td><td className="px-3 py-2"><input type="number" min="0" value={items[index]?.validityDays || ""} onChange={(event) => updateItem(index, "validityDays", event.target.value)} className="h-9 w-24 rounded-md border border-borderSoft px-2" /></td><td className="px-3 py-2"><textarea value={items[index]?.technicalDeviation || ""} onChange={(event) => updateItem(index, "technicalDeviation", event.target.value)} className="min-h-16 w-48 resize-y rounded-md border border-borderSoft p-2" placeholder="无偏差可留空" /></td><td className="px-3 py-2"><textarea value={items[index]?.commercialDeviation || ""} onChange={(event) => updateItem(index, "commercialDeviation", event.target.value)} className="min-h-16 w-48 resize-y rounded-md border border-borderSoft p-2" placeholder="税费、付款等偏差" /></td><td className="whitespace-nowrap px-3 py-3 text-right font-bold text-primary">{currency} {(Number(items[index]?.unitPrice || 0) * Number(source.quantity)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>)}</tbody></table></div>
              <div className="flex justify-end border-t border-borderSoft bg-primary-soft px-4 py-3"><span className="text-sm">报价总额：<b className="ml-2 text-lg text-primary">{currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span></div>
            </section>
            <section className="grid gap-4 rounded-card border border-borderSoft bg-white p-4 shadow-card lg:grid-cols-4"><label className="text-[12px] font-bold">联系人<input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal" /></label><label className="text-[12px] font-bold">邮箱<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal" /></label><label className="text-[12px] font-bold">电话<input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal" /></label><label className="text-[12px] font-bold">总体说明<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal" /></label></section>
            {error ? <p className="rounded-md bg-danger-soft p-3 text-[12px] text-danger">{error}</p> : null}
            <div className="flex justify-end"><button disabled={submitting} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-bold text-white disabled:opacity-50">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}确认并提交报价</button></div>
          </form>
        )}
      </div>
    </main>
  );
}
