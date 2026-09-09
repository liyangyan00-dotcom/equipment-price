import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Users, Database, Bot, Cable, History, RefreshCw, AlertTriangle, Building2, ShieldCheck, CheckCircle2, Clock3 } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

export const settingsGroups = [
  { title: "组织与成员", icon: Users, tone: "blue" as const, links: [{ label: "成员管理", href: "/settings/users", detail: "工作组成员与账号状态" }, { label: "角色与权限", href: "/settings/roles", detail: "角色授权与业务权限" }] },
  { title: "价格基础", icon: Database, tone: "cyan" as const, links: [{ label: "基础数据字典", href: "/settings/dictionaries", detail: "设备分类、地材分类、单位、币种" }], unavailable: "汇率维护、地区配置：暂无独立配置入口" },
  { title: "AI 与审核", icon: Bot, tone: "purple" as const, links: [{ label: "AI 规则设置", href: "/settings/ai", detail: "模型、提示词与审核门禁" }, { label: "AI 配置审计", href: "/settings/ai/audit-logs", detail: "配置变更与生效记录" }] },
  { title: "采集与集成", icon: Cable, tone: "green" as const, links: [{ label: "外部集成与采集来源", href: "/settings/integrations", detail: "来源白名单、API 凭据与邮件连接" }, { label: "采集任务与周期", href: "/ai-price-collection", detail: "任务范围、执行频率与运行结果" }] },
  { title: "运维与审计", icon: History, tone: "orange" as const, links: [{ label: "操作日志", href: "/settings/logs", detail: "业务操作与配置变更" }, { label: "自动化运行", href: "/ai-workbench", detail: "运行矩阵、失败事件与人工审核" }], unavailable: "自动归档策略：暂无独立配置入口" },
];
const roles: Record<string, string> = { admin: "管理员", manager: "经理", editor: "编辑人员", reviewer: "审核人员", viewer: "只读成员" };
const groupColors = {
  blue: "border-primary/25 border-l-primary bg-primary-soft hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-primary",
  cyan: "border-cyan/25 border-l-cyan bg-cyan-soft hover:border-cyan/60 hover:bg-cyan/10 focus-visible:outline-cyan",
  purple: "border-ai/25 border-l-ai bg-ai-soft hover:border-ai/60 hover:bg-ai/10 focus-visible:outline-ai",
  green: "border-success/25 border-l-success bg-success-soft hover:border-success/60 hover:bg-success/10 focus-visible:outline-success",
  orange: "border-warning/25 border-l-warning bg-warning-soft hover:border-warning/60 hover:bg-warning/10 focus-visible:outline-warning",
};

export function SettingsHome({ organization, role, error, checkedAt, recovery }: {
  organization: { name: string; code: string } | null; role: string;
  error: string; checkedAt: string; recovery?: ReactNode;
}) {
  return <div className="mx-auto min-w-0 max-w-[1680px] space-y-4" data-no-global-interaction>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft bg-white px-5 py-5 sm:px-6">
      <h1 className="text-page-title font-semibold text-textMain">系统设置</h1>
      <a href="/settings" aria-label="刷新工作组状态" title="刷新工作组状态" className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-primary"><RefreshCw className="size-4" /></a>
    </header>
    {error ? <section role="alert" className="flex flex-wrap items-start gap-3 border-l-4 border-warning bg-warning/10 p-4 text-[13px] text-textMain"><AlertTriangle className="size-5 shrink-0 text-warning" /><div className="min-w-0 flex-1 space-y-2 break-words"><p>{error}</p>{recovery}</div></section> : null}
    <dl className="grid gap-x-6 gap-y-5 border-y border-borderSoft bg-white px-5 py-5 text-[13px] sm:grid-cols-2 sm:px-6 2xl:grid-cols-4">
      <div className="min-w-0"><dt className="flex items-center gap-2 text-[12px] text-textMuted"><Building2 className="size-4 text-primary" />当前工作组</dt><dd className="mt-2 break-words text-[15px] font-semibold text-textMain">{organization?.name || "未读取"}</dd>{organization ? <dd className="mt-1 break-all text-[11px] text-textMuted">{organization.code}</dd> : null}</div>
      <div><dt className="flex items-center gap-2 text-[12px] text-textMuted"><ShieldCheck className="size-4 text-primary" />当前角色</dt><dd className="mt-2 font-semibold text-textMain">{roles[role] || "未读取"}</dd></div>
      <div><dt className="flex items-center gap-2 text-[12px] text-textMuted"><CheckCircle2 className="size-4 text-success" />组织访问</dt><dd className={`mt-2 inline-flex items-center gap-2 text-[12px] font-semibold ${organization ? "text-success" : "text-warning"}`}><span className={`size-1.5 rounded-full ${organization ? "bg-success" : "bg-warning"}`} />{organization ? "工作组读取成功" : "暂不可用"}</dd></div>
      <div><dt className="flex items-center gap-2 text-[12px] text-textMuted"><Clock3 className="size-4" />最近检查（北京时间）</dt><dd className="mt-2 text-[12px] tabular-nums text-textSecondary">{checkedAt}</dd></div>
    </dl>
    <nav aria-label="设置分类" className="divide-y divide-borderSoft border-y border-borderSoft bg-white">
      {settingsGroups.map((group) => <section key={group.title} className="grid min-w-0 gap-4 px-5 py-5 sm:px-6 xl:grid-cols-[190px_minmax(0,1fr)] xl:gap-6">
        <ModuleHeader icon={group.icon} title={group.title} tone={group.tone} className="self-start xl:pt-3" />
        <div className="min-w-0"><ul className="grid gap-3 sm:grid-cols-2">{group.links.map((link) => <li key={link.href} className="min-w-0"><Link href={link.href} className={`group flex min-h-[84px] items-center gap-3 rounded-lg border border-l-4 px-4 py-3 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 ${groupColors[group.tone]}`}><span className="min-w-0 flex-1"><span className="block break-words text-[14px] font-semibold text-textMain">{link.label}</span><span className="mt-1.5 block break-words text-[12px] leading-5 text-textSecondary">{link.detail}</span></span><ArrowRight className="size-4 shrink-0 text-textSecondary transition-transform motion-reduce:transition-none motion-safe:group-hover:translate-x-0.5" /></Link></li>)}</ul>{group.unavailable ? <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-textMuted"><Clock3 className="mt-0.5 size-3.5 shrink-0" />{group.unavailable}</p> : null}</div>
      </section>)}
    </nav>
  </div>;
}
