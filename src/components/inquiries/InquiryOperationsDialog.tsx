"use client";

import { useEffect, useId, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  LoaderCircle,
  Paperclip,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import {
  InquiryAttachmentDialog,
  type InquiryAttachment,
} from "@/components/inquiries/InquiryAttachmentDialog";

type SupplierResponse = {
  supplier_id: string;
  quoted_amount: number | null;
  currency: string | null;
  responded_at: string | null;
  delivery_status?: string | null;
  last_error?: string | null;
  wpi_suppliers?: {
    name?: string;
    wpi_supplier_contacts?: Array<{ email?: string | null }>;
  } | null;
};

type InquiryEvent = {
  id: string;
  event_type: string;
  event_status: string;
  created_at: string;
  error_message?: string | null;
  wpi_suppliers?: { name?: string } | null;
};

type ReminderPolicy = {
  enabled: boolean;
  interval_hours: number;
  max_reminders: number;
  reminder_count: number;
  next_run_at: string | null;
  last_run_at: string | null;
  last_error: string | null;
  escalate_after_deadline_hours: number;
};

type ComparisonBasis = {
  base_currency?: string;
  comparison_date?: string;
};

const DEFAULT_REMINDER_POLICY: ReminderPolicy = {
  enabled: false,
  interval_hours: 48,
  max_reminders: 3,
  reminder_count: 0,
  next_run_at: null,
  last_run_at: null,
  last_error: null,
  escalate_after_deadline_hours: 24,
};

type Props = {
  open: boolean;
  mode: "quote" | "timeline";
  inquiryId: string;
  inquiryCode: string;
  onClose: () => void;
  onChanged: () => void;
  initialSupplierId?: string;
  onNotice: (
    tone: "success" | "danger" | "warning" | "info",
    title: string,
    detail: string,
  ) => void;
};

const EVENT_LABELS: Record<string, string> = {
  sent: "询价函已发送",
  delivered: "邮件已送达",
  opened: "供应商已打开",
  replied: "供应商已回复",
  reminded: "已发送催办",
  send_failed: "发送失败",
  retry_requested: "已重试发送",
  quote_recorded: "报价已回填",
  comparison_generated: "已生成比价",
  comparison_decided: "已完成人工决策",
};

export function InquiryOperationsDialog({
  open,
  mode,
  inquiryId,
  inquiryCode,
  onClose,
  onChanged,
  initialSupplierId,
  onNotice,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [responses, setResponses] = useState<SupplierResponse[]>([]);
  const [events, setEvents] = useState<InquiryEvent[]>([]);
  const [reminderPolicy, setReminderPolicy] = useState<ReminderPolicy>(
    DEFAULT_REMINDER_POLICY,
  );
  const [attachments, setAttachments] = useState<InquiryAttachment[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [respondedAt, setRespondedAt] = useState("");
  const [note, setNote] = useState("");
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [portalUrl, setPortalUrl] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [comparisonDate, setComparisonDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);

  useEffect(() => {
    if (!open || !inquiryId) return;
    let active = true;
    const endpoint = mode === "quote" ? "responses" : "events";
    const timer = window.setTimeout(() => {
      setLoading(true);
      Promise.all([
        fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/${endpoint}`, {
          cache: "no-store",
        }).then(async (response) => {
          const payload = (await response.json()) as {
            data?: SupplierResponse[] | InquiryEvent[];
            error?: string;
          };
          if (!response.ok) throw new Error(payload.error || "数据读取失败");
          return payload.data ?? [];
        }),
        mode === "quote"
          ? fetch(
              `/api/inquiries/${encodeURIComponent(inquiryId)}/attachments`,
              {
                cache: "no-store",
              },
            ).then(async (response) => {
              const payload = (await response.json()) as {
                data?: InquiryAttachment[];
                error?: string;
              };
              if (!response.ok)
                throw new Error(payload.error || "附件读取失败");
              return payload.data ?? [];
            })
          : Promise.resolve([] as InquiryAttachment[]),
        mode === "quote"
          ? fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}`, {
              cache: "no-store",
            }).then(async (response) => {
              const payload = (await response.json()) as {
                data?: ComparisonBasis;
                error?: string;
              };
              if (!response.ok)
                throw new Error(payload.error || "比价基准读取失败");
              return payload.data ?? {};
            })
          : Promise.resolve({} as ComparisonBasis),
        mode === "timeline"
          ? fetch(
              `/api/inquiries/${encodeURIComponent(inquiryId)}/reminder-policy`,
              { cache: "no-store" },
            ).then(async (response) => {
              const payload = (await response.json()) as {
                data?: ReminderPolicy | null;
                error?: string;
              };
              if (!response.ok)
                throw new Error(payload.error || "催办策略读取失败");
              return payload.data ?? DEFAULT_REMINDER_POLICY;
            })
          : Promise.resolve(DEFAULT_REMINDER_POLICY),
      ])
        .then(([data, files, comparison, policy]) => {
          if (!active) return;
          if (mode === "quote") {
            const next = data as SupplierResponse[];
            setResponses(next);
            setSupplierId((current) => initialSupplierId || current || next[0]?.supplier_id || "");
            setAttachments(files);
            const comparisonBasis = comparison as ComparisonBasis;
            setBaseCurrency(comparisonBasis.base_currency || "USD");
            setComparisonDate(
              comparisonBasis.comparison_date ||
                new Date().toISOString().slice(0, 10),
            );
          } else {
            setEvents(data as InquiryEvent[]);
            setReminderPolicy(policy);
            setSupplierId(initialSupplierId || "");
          }
        })
        .catch((error) =>
          onNotice(
            "danger",
            "操作数据读取失败",
            error instanceof Error ? error.message : "请稍后重试",
          ),
        )
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [inquiryId, initialSupplierId, mode, onNotice, open]);

  const saveReminderPolicy = async () => {
    setPolicyBusy(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/reminder-policy`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: reminderPolicy.enabled,
            intervalHours: reminderPolicy.interval_hours,
            maxReminders: reminderPolicy.max_reminders,
            escalateAfterDeadlineHours:
              reminderPolicy.escalate_after_deadline_hours,
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: ReminderPolicy;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "催办策略保存失败");
      setReminderPolicy(payload.data);
      onNotice(
        "success",
        "催办策略已保存",
        payload.data.enabled
          ? `系统将在 ${payload.data.interval_hours} 小时间隔内检查待响应供应商。`
          : "自动催办已关闭，仍可执行单次人工催办。",
      );
      onChanged();
    } catch (error) {
      onNotice(
        "danger",
        "催办策略保存失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setPolicyBusy(false);
    }
  };

  const sendReminderNow = async () => {
    setPolicyBusy(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            retry: true,
            mode: "reminder",
            supplierIds: supplierId ? [supplierId] : undefined,
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: { succeeded?: number; failed?: number };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "真实催办失败");
      onNotice(
        "success",
        "真实催办已执行",
        `${supplierId ? "已对当前供应商执行定向催办。" : "已对全部待响应供应商执行催办。"} 成功 ${payload.data?.succeeded ?? 0} 家，失败 ${payload.data?.failed ?? 0} 家；结果已写入执行时间线。`,
      );
      onChanged();
    } catch (error) {
      onNotice(
        "danger",
        "真实催办未完成",
        error instanceof Error ? error.message : "请检查邮件集成配置",
      );
    } finally {
      setPolicyBusy(false);
    }
  };

  const saveQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            quotedAmount: Number(amount),
            currency,
            respondedAt: respondedAt || undefined,
            attachmentIds,
            note,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "报价回填失败");
      onNotice(
        "success",
        "供应商报价已写入",
        "金额、币种、响应时间与证据附件已进入真实询价记录和审计时间线。",
      );
      onChanged();
      onClose();
    } catch (error) {
      onNotice(
        "danger",
        "报价回填失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  };

  const createPortalLink = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/portal-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId, expiresInDays: 14 }),
        },
      );
      const payload = (await response.json()) as {
        data?: { url?: string; expiresAt?: string };
        error?: string;
      };
      if (!response.ok || !payload.data?.url)
        throw new Error(payload.error || "供应商填报链接生成失败");
      setPortalUrl(payload.data.url);
      await navigator.clipboard.writeText(payload.data.url).catch(() => undefined);
      onNotice(
        "success",
        "供应商填报链接已生成",
        `链接已复制，有效期至 ${new Date(payload.data.expiresAt || "").toLocaleString("zh-CN")}。`,
      );
    } catch (error) {
      onNotice(
        "danger",
        "填报链接生成失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveComparisonBasis = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiryId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseCurrency, comparisonDate }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok)
        throw new Error(payload?.error || "比价基准保存失败");
      onNotice(
        "success",
        "比价基准已保存",
        `后续比价将按 ${comparisonDate} 的可核验参考汇率折算至 ${baseCurrency}。`,
      );
      onChanged();
    } catch (error) {
      onNotice(
        "danger",
        "比价基准保存失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OverlayShell
        open={open}
        onClose={onClose}
        variant="drawer"
        panelClassName="w-[520px]"
        labelledBy={titleId}
        describedBy={descriptionId}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
            <div>
              <h2 id={titleId} className="text-[16px] font-bold text-textMain">
                {mode === "quote" ? "回填供应商报价" : "询价执行时间线"}
              </h2>
              <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">
                {inquiryCode} · 数据实时写入 Supabase
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-[12px] text-textMuted">
                <LoaderCircle className="size-4 animate-spin" />
                正在读取真实记录
              </div>
            ) : mode === "quote" ? (
              <div className="space-y-4">
                <section className="rounded-card border border-primary/15 bg-primary-soft/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <b className="text-[12px] text-primary">多币种比价基准</b>
                      <p className="mt-1 text-[10px] leading-4 text-textMuted">
                        汇率按基准日获取并保存快照；生成比价后仍需人工确认采用方案。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveComparisonBasis()}
                      disabled={loading}
                      className="h-8 shrink-0 rounded-md border border-primary/20 bg-white px-3 text-[11px] font-bold text-primary disabled:opacity-45"
                    >
                      保存基准
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-bold text-textSecondary">
                      折算基准币种
                      <select
                        value={baseCurrency}
                        onChange={(event) => setBaseCurrency(event.target.value)}
                        className="mt-1 h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px] font-normal"
                      >
                        {["USD", "CNY", "EUR", "CDF", "ZAR"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[10px] font-bold text-textSecondary">
                      比价基准日期
                      <input
                        type="date"
                        value={comparisonDate}
                        onChange={(event) => setComparisonDate(event.target.value)}
                        className="mt-1 h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px] font-normal"
                      />
                    </label>
                  </div>
                </section>
                <label className="block text-[12px] font-bold">
                  供应商
                  <select
                    value={supplierId}
                    onChange={(event) => setSupplierId(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal"
                  >
                    <option value="">请选择供应商</option>
                    {responses.map((item) => (
                      <option key={item.supplier_id} value={item.supplier_id}>
                        {item.wpi_suppliers?.name || item.supplier_id}
                        {item.quoted_amount
                          ? ` · 已报 ${item.currency} ${item.quoted_amount}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <section className="rounded-card border border-ai-border bg-ai-soft p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <b className="text-[12px] text-ai">供应商自助逐项报价</b>
                      <p className="mt-1 text-[11px] text-textMuted">
                        生成一次性受控链接，由供应商填写逐项价格、交期及技术/商务偏差。
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading || !supplierId}
                      onClick={() => void createPortalLink()}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ai px-3 text-[11px] font-bold text-white disabled:opacity-45"
                    >
                      <Link2 className="size-3.5" />
                      生成填报链接
                    </button>
                  </div>
                  {portalUrl ? (
                    <button
                      type="button"
                      title={portalUrl}
                      onClick={() => {
                        void navigator.clipboard.writeText(portalUrl);
                        onNotice("info", "链接已复制", "可发送给当前受邀供应商填写报价。");
                      }}
                      className="mt-2 block w-full truncate rounded-md border border-ai-border bg-white px-2 py-2 text-left text-[10px] text-primary"
                    >
                      {portalUrl}
                    </button>
                  ) : null}
                </section>
                <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                  <label className="block text-[12px] font-bold">
                    报价金额
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal"
                      placeholder="请输入实际报价"
                    />
                  </label>
                  <label className="block text-[12px] font-bold">
                    币种
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal"
                    >
                      <option>CNY</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>CDF</option>
                    </select>
                  </label>
                </div>
                <label className="block text-[12px] font-bold">
                  供应商响应时间
                  <input
                    value={respondedAt}
                    onChange={(event) => setRespondedAt(event.target.value)}
                    type="datetime-local"
                    className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal"
                  />
                </label>
                <label className="block text-[12px] font-bold">
                  回填说明
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-1.5 min-h-24 w-full resize-y rounded-md border border-borderSoft p-3 font-normal"
                    placeholder="记录税费、交期、价格条件或人工核验说明"
                  />
                </label>
                <section className="rounded-card border border-borderSoft">
                  <div className="flex items-center justify-between border-b border-borderSoft px-3 py-2">
                    <b className="text-[12px]">报价证据附件</b>
                    <button
                      type="button"
                      onClick={() => setAttachmentOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                    >
                      <Paperclip className="size-3.5" />
                      上传附件
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-2">
                    {attachments.length ? (
                      attachments.map((item) => (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={attachmentIds.includes(item.id)}
                            onChange={() =>
                              setAttachmentIds((items) =>
                                items.includes(item.id)
                                  ? items.filter((id) => id !== item.id)
                                  : [...items, item.id],
                              )
                            }
                          />
                          <FileText className="size-4 text-primary" />
                          <span className="min-w-0 flex-1 truncate text-[12px]">
                            {item.name}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="p-4 text-center text-[11px] text-textMuted">
                        暂无附件，可先上传供应商报价单。
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                <section className="rounded-card border border-ai-border bg-ai-soft/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-ai shadow-sm">
                        <BellRing className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <b className="text-[12px] text-ai">供应商催办策略</b>
                        <p className="mt-0.5 text-[10px] leading-4 text-textMuted">
                          策略持久化到 Supabase；自动执行仍受邮件 Provider 与定时任务状态约束。
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex shrink-0 items-center gap-2 text-[11px] font-bold text-textSecondary">
                      <input
                        type="checkbox"
                        checked={reminderPolicy.enabled}
                        onChange={(event) =>
                          setReminderPolicy((value) => ({
                            ...value,
                            enabled: event.target.checked,
                          }))
                        }
                        className="accent-ai"
                      />
                      自动催办
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label className="text-[10px] font-bold text-textSecondary">
                      间隔（小时）
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={reminderPolicy.interval_hours}
                        onChange={(event) =>
                          setReminderPolicy((value) => ({
                            ...value,
                            interval_hours: Number(event.target.value) || 1,
                          }))
                        }
                        className="mt-1 h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px]"
                      />
                    </label>
                    <label className="text-[10px] font-bold text-textSecondary">
                      最多次数
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={reminderPolicy.max_reminders}
                        onChange={(event) =>
                          setReminderPolicy((value) => ({
                            ...value,
                            max_reminders: Number(event.target.value) || 0,
                          }))
                        }
                        className="mt-1 h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px]"
                      />
                    </label>
                    <label className="text-[10px] font-bold text-textSecondary">
                      逾期升级（小时）
                      <input
                        type="number"
                        min="0"
                        max="720"
                        value={reminderPolicy.escalate_after_deadline_hours}
                        onChange={(event) =>
                          setReminderPolicy((value) => ({
                            ...value,
                            escalate_after_deadline_hours:
                              Number(event.target.value) || 0,
                          }))
                        }
                        className="mt-1 h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px]"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-textMuted">
                    <span>已催办 {reminderPolicy.reminder_count} 次</span>
                    <span className="text-right">
                      下次检查：
                      {reminderPolicy.next_run_at
                        ? new Date(reminderPolicy.next_run_at).toLocaleString(
                            "zh-CN",
                          )
                        : "保存后生成"}
                    </span>
                  </div>
                  {reminderPolicy.last_error ? (
                    <p className="mt-2 rounded-md bg-danger-soft p-2 text-[10px] text-danger">
                      最近错误：{reminderPolicy.last_error}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={policyBusy}
                      onClick={() => void saveReminderPolicy()}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-ai text-[11px] font-bold text-white disabled:opacity-45"
                    >
                      {policyBusy ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Settings2 className="size-3.5" />
                      )}
                      保存策略
                    </button>
                    <button
                      type="button"
                      disabled={policyBusy}
                      onClick={() => void sendReminderNow()}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-success/20 bg-success-soft text-[11px] font-bold text-success disabled:opacity-45"
                    >
                      <Send className="size-3.5" />
                      立即真实催办
                    </button>
                  </div>
                </section>
                {events.length ? (
                  <div className="space-y-3">
                {events.map((item) => (
                  <article
                    key={item.id}
                    className="grid grid-cols-[36px_minmax(0,1fr)] gap-3"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                      {item.event_status === "failed" ? (
                        <X className="size-4" />
                      ) : item.event_type === "sent" ||
                        item.event_type === "reminded" ? (
                        <Send className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </div>
                    <div className="rounded-card border border-borderSoft p-3">
                      <div className="flex items-center justify-between gap-3">
                        <b className="text-[12px]">
                          {EVENT_LABELS[item.event_type] || item.event_type}
                        </b>
                        <span className="whitespace-nowrap text-[10px] text-textMuted">
                          {new Date(item.created_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {item.wpi_suppliers?.name ? (
                        <p className="mt-1 text-[11px] text-textSecondary">
                          {item.wpi_suppliers.name}
                        </p>
                      ) : null}
                      {item.error_message ? (
                        <p className="mt-2 rounded-md bg-danger-soft p-2 text-[11px] text-danger">
                          {item.error_message}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
                  </div>
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <Clock3 className="size-9 text-textMuted" />
                <b className="mt-3 text-[13px]">暂无执行事件</b>
                <p className="mt-1 text-[11px] text-textMuted">
                  发送、送达、打开、回复、报价和决策会自动记录在这里。
                </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {mode === "quote" ? (
            <div className="grid grid-cols-2 gap-2 border-t border-borderSoft p-4">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-md border border-borderSoft font-bold"
              >
                取消
              </button>
              <button
                type="button"
                disabled={loading || !supplierId || !amount}
                onClick={() => void saveQuote()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary font-bold text-white disabled:opacity-45"
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                确认回填
              </button>
            </div>
          ) : null}
        </div>
      </OverlayShell>
      <InquiryAttachmentDialog
        open={attachmentOpen}
        inquiryId={inquiryId}
        onClose={() => setAttachmentOpen(false)}
        onChanged={setAttachments}
        onNotice={onNotice}
      />
    </>
  );
}
