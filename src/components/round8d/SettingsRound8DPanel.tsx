"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  CircleDollarSign,
  Database,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { ConfirmDialog, IconBox } from "@/components/common";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "base", label: "基础信息", icon: Building2 },
  { key: "currency", label: "币种与汇率", icon: CircleDollarSign },
  { key: "project", label: "地区与项目", icon: SlidersHorizontal },
  { key: "equipment", label: "设备分类", icon: Database },
  { key: "material", label: "地材分类", icon: BookOpen },
  { key: "risk", label: "风险规则", icon: ShieldAlert },
  { key: "notice", label: "通知提醒", icon: Bell },
  { key: "users", label: "用户权限", icon: Users },
];

type SettingsForm = {
  systemName: string;
  timezone: string;
  currency: string;
  baseCurrency: string;
  exchangeRate: string;
  exchangeSource: string;
  region: string;
  projectRegions: string;
  defaultProjectRegion: string;
  equipmentCategories: string;
  materialCategories: string;
  threshold: string;
  confidenceThreshold: string;
  notify: boolean;
  noticeChannels: string;
  reminderFrequency: string;
  defaultRole: string;
  inquiryApproval: boolean;
};

const defaultForm: SettingsForm = {
  systemName: "水务智采 · AI 价格情报与成本决策平台",
  timezone: "Asia/Shanghai (UTC+8)",
  currency: "USD/CNY 7.18",
  baseCurrency: "USD",
  exchangeRate: "7.18",
  exchangeSource: "中国外汇交易中心 / 人工复核",
  region: "Kinshasa / South Africa / China",
  projectRegions: "刚果（金）、南非、中国",
  defaultProjectRegion: "刚果（金）",
  equipmentCategories: "水泵设备、阀门管件、电气自动化、实验室设备",
  materialCategories: "钢材、水泥、砂石、管材、安装辅材",
  threshold: "价格偏离市场均值 25%",
  confidenceThreshold: "80%",
  notify: true,
  noticeChannels: "站内通知 + 邮件",
  reminderFrequency: "每日汇总",
  defaultRole: "价格库业务员",
  inquiryApproval: true,
};

const tabDescriptions: Record<string, string> = {
  base: "维护系统名称、时区和默认显示信息。",
  currency: "配置基准币种、业务汇率及汇率来源。",
  project: "维护业务地区、项目范围和默认项目区域。",
  equipment: "维护设备价格库使用的分类口径。",
  material: "维护地材价格库使用的分类口径。",
  risk: "配置价格风险阈值和 AI 可信度审核边界。",
  notice: "配置待审核、高风险和任务状态通知方式。",
  users: "配置默认角色和询价审批要求。",
};

export function SettingsRound8DPanel() {
  const router = useRouter();
  const toast = useMockToast();
  const [active, setActive] = useState("base");
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("round8d:settings");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<SettingsForm>;
      const normalized = Object.fromEntries(
        Object.entries(parsed).filter(([key, value]) => {
          if (!(key in defaultForm) || value === null || value === undefined) return false;
          return typeof value === typeof defaultForm[key as keyof SettingsForm];
        }),
      ) as Partial<SettingsForm>;

      window.setTimeout(() => {
        setForm({ ...defaultForm, ...normalized });
      }, 0);
    } catch {
      window.localStorage.removeItem("round8d:settings");
    }
  }, []);

  const current = useMemo(() => tabs.find((tab) => tab.key === active) ?? tabs[0], [active]);
  const CurrentIcon = current.icon;

  const setValue = <Key extends keyof SettingsForm>(key: Key, value: SettingsForm[Key]) => {
    setForm((item) => ({ ...item, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    if (!form.systemName.trim()) {
      toast.warning("保存失败", "系统名称不能为空。");
      return;
    }
    window.localStorage.setItem("round8d:settings", JSON.stringify(form));
    setDirty(false);
    toast.success("系统设置已保存", "配置已写入 localStorage mock 状态。");
  };

  const reset = () => {
    setForm(defaultForm);
    setDirty(false);
    window.localStorage.removeItem("round8d:settings");
    setConfirmOpen(false);
    toast.info("设置已恢复默认", "已恢复前端默认 mock 配置。");
  };

  const inputClass =
    "h-9 w-full rounded-[8px] border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textMain outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
  const labelClass = "text-[12px] font-bold text-textSecondary";

  const renderTextField = (
    label: string,
    key: keyof SettingsForm,
    options?: { wide?: boolean; hint?: string },
  ) => (
    <label className={cn("space-y-1.5", options?.wide && "md:col-span-2")}>
      <span className={labelClass}>{label}</span>
      <input
        value={typeof form[key] === "string" ? form[key] : ""}
        onChange={(event) => setValue(key, event.target.value as never)}
        className={inputClass}
      />
      {options?.hint ? <span className="block text-[11px] text-textMuted">{options.hint}</span> : null}
    </label>
  );

  const renderToggle = (
    label: string,
    description: string,
    key: "notify" | "inquiryApproval",
  ) => (
    <label className="flex min-h-16 items-center justify-between rounded-[10px] border border-borderSoft bg-white px-3 py-2">
      <span>
        <span className="block text-[12px] font-bold text-textSecondary">{label}</span>
        <span className="text-[11px] text-textMuted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={Boolean(form[key])}
        onChange={(event) => setValue(key, event.target.checked)}
        className="size-4 accent-primary"
      />
    </label>
  );

  const renderSettingsContent = () => {
    switch (active) {
      case "currency":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderTextField("基准币种", "baseCurrency")}
            {renderTextField("USD / CNY 汇率", "exchangeRate")}
            {renderTextField("汇率展示", "currency")}
            {renderTextField("汇率数据来源", "exchangeSource")}
            <div className="md:col-span-2 rounded-[10px] border border-primary/15 bg-primary-soft px-3 py-2 text-[12px] text-primary">
              汇率变更仅影响后续价格折算；历史报价保留当时汇率，并进入人工复核。
            </div>
          </div>
        );
      case "project":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderTextField("地区与项目范围", "region", { wide: true })}
            {renderTextField("启用地区", "projectRegions")}
            {renderTextField("默认项目地区", "defaultProjectRegion")}
            <div className="md:col-span-2 rounded-[10px] border border-borderSoft bg-white p-3">
              <p className={labelClass}>当前项目区域</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.projectRegions.split(/[、,，]/).filter(Boolean).map((item) => (
                  <span key={item} className="rounded-pill border border-primary/15 bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                    {item.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      case "equipment":
        return (
          <div className="grid gap-3">
            {renderTextField("设备分类口径", "equipmentCategories", {
              wide: true,
              hint: "使用顿号或逗号分隔；保存后供设备价格库筛选器使用。",
            })}
            <div className="rounded-[10px] border border-borderSoft bg-white p-3">
              <p className={labelClass}>已启用设备分类</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {form.equipmentCategories.split(/[、,，]/).filter(Boolean).map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-[8px] bg-[#F8FAFD] px-3 py-2 text-[12px]">
                    <span className="font-semibold text-textMain">{item.trim()}</span>
                    <span className="text-textMuted">分类 {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "material":
        return (
          <div className="grid gap-3">
            {renderTextField("地材分类口径", "materialCategories", {
              wide: true,
              hint: "使用顿号或逗号分隔；保存后供地材价格库和采集任务使用。",
            })}
            <div className="rounded-[10px] border border-borderSoft bg-white p-3">
              <p className={labelClass}>已启用地材分类</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.materialCategories.split(/[、,，]/).filter(Boolean).map((item) => (
                  <span key={item} className="rounded-pill border border-success/15 bg-success-soft px-3 py-1.5 text-[11px] font-bold text-success">
                    {item.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      case "risk":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderTextField("价格风险阈值", "threshold")}
            {renderTextField("AI 可信度人工复核阈值", "confidenceThreshold")}
            <div className="md:col-span-2 rounded-[10px] border border-warning/20 bg-warning-soft p-3">
              <p className="text-[12px] font-black text-warning">审核边界</p>
              <p className="mt-1 text-[12px] leading-5 text-textSecondary">
                超出价格阈值或低于可信度阈值的数据只进入待审核队列，AI 不直接确认价格有效。
              </p>
            </div>
          </div>
        );
      case "notice":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderToggle("通知提醒", "高风险和待审核任务提醒", "notify")}
            {renderTextField("通知渠道", "noticeChannels")}
            {renderTextField("提醒频率", "reminderFrequency")}
            <div className="rounded-[10px] border border-borderSoft bg-white px-3 py-2">
              <p className={labelClass}>通知范围</p>
              <p className="mt-1 text-[11px] leading-5 text-textMuted">价格审核、供应商风险、询价截止和 AI 任务异常。</p>
            </div>
          </div>
        );
      case "users":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderTextField("默认业务角色", "defaultRole")}
            {renderToggle("询价审批", "创建询价后必须由有权限人员确认", "inquiryApproval")}
            <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
              {[
                ["管理员", "系统、组织和权限配置"],
                ["价格库业务员", "价格维护、询价和资料补全"],
                ["审核员", "价格、供应商和 AI 结果复核"],
              ].map(([role, description]) => (
                <div key={role} className="rounded-[10px] border border-borderSoft bg-white p-3">
                  <p className="text-[12px] font-black text-textMain">{role}</p>
                  <p className="mt-1 text-[11px] leading-5 text-textMuted">{description}</p>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2 rounded-[10px] border border-primary/15 bg-primary-soft p-3">
              <button type="button" onClick={() => router.push("/settings/users")} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-bold text-white">
                <Users className="size-3.5" />管理组织成员
              </button>
              <button type="button" onClick={() => router.push("/settings/roles")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ai-border bg-white px-3 text-[11px] font-bold text-ai">
                <ShieldCheck className="size-3.5" />配置角色权限
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {renderTextField("系统名称", "systemName")}
            {renderTextField("系统时区", "timezone")}
            {renderTextField("默认币种与汇率", "currency")}
            {renderTextField("默认业务范围", "region")}
          </div>
        );
    }
  };

  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft pb-3">
        <div className="flex items-center gap-2">
          <IconBox icon={CurrentIcon} tone="blue" size="sm" />
          <div>
            <h2 className="text-[15px] font-black text-textMain">系统设置交互区</h2>
            <p className="text-[12px] text-textSecondary">切换不同配置页签，编辑后可 mock 保存或恢复默认。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="rounded-pill bg-warning-soft px-2 py-1 text-[11px] font-bold text-warning">有未保存修改</span> : null}
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary">
            <RotateCcw className="size-3.5" />
            恢复默认
          </button>
          <button type="button" onClick={save} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-primary px-3 text-[12px] font-bold text-white shadow-primary">
            <Save className="size-3.5" />
            保存设置
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <nav className="grid gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActive(tab.key);
                  toast.info("设置页签已切换", `当前页签：${tab.label}`);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-[9px] px-3 py-2 text-left text-[12px] font-bold transition",
                  active === tab.key ? "bg-primary text-white shadow-primary" : "border border-borderSoft bg-white text-textSecondary hover:border-primary/40"
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="rounded-[14px] border border-borderSoft bg-[#F8FAFD] p-3">
          <div className="mb-3 flex items-start gap-2 border-b border-borderSoft pb-2.5">
            <IconBox icon={CurrentIcon} tone="blue" size="sm" />
            <div>
              <p className="text-[13px] font-black text-textMain">{current.label}</p>
              <p className="mt-0.5 text-[11px] text-textMuted">{tabDescriptions[active]}</p>
            </div>
          </div>
          {renderSettingsContent()}
        </div>

        <aside className="rounded-[14px] border border-ai-border bg-ai-soft/50 p-3">
          <p className="text-[13px] font-black text-ai">快捷入口</p>
          <div className="mt-2 grid gap-2">
            <button type="button" onClick={() => router.push("/settings/users")} className="rounded-[9px] border border-primary/20 bg-white px-3 py-2 text-left text-[12px] font-bold text-primary">
              管理组织成员
            </button>
            <button type="button" onClick={() => router.push("/settings/roles")} className="rounded-[9px] border border-ai-border bg-white px-3 py-2 text-left text-[12px] font-bold text-ai">
              配置角色权限
            </button>
            <button type="button" onClick={() => router.push("/settings/ai")} className="rounded-[9px] border border-ai-border bg-white px-3 py-2 text-left text-[12px] font-bold text-ai">
              进入 AI 规则设置
            </button>
            <button type="button" onClick={() => router.push("/settings/logs")} className="rounded-[9px] border border-borderSoft bg-white px-3 py-2 text-left text-[12px] font-bold text-primary">
              查看审计日志
            </button>
            <button type="button" onClick={() => router.push("/settings/dictionaries")} className="rounded-[9px] border border-borderSoft bg-white px-3 py-2 text-left text-[12px] font-bold text-success">
              管理数据字典
            </button>
            <button type="button" onClick={() => router.push("/settings/integrations")} className="rounded-[9px] border border-borderSoft bg-white px-3 py-2 text-left text-[12px] font-bold text-warning">
              管理外部集成
            </button>
            <button type="button" onClick={() => router.push("/settings/ai/audit-logs")} className="rounded-[9px] border border-ai-border bg-white px-3 py-2 text-left text-[12px] font-bold text-ai">
              查看 AI 审计日志
            </button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="恢复默认设置"
        description="这会清除当前前端 mock 设置并恢复默认值。"
        tone="warning"
        confirmLabel="恢复默认"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={reset}
      />
    </section>
  );
}
