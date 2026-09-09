import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Users, Database, Bot, Cable, History, RefreshCw, AlertTriangle, Building2, ShieldCheck, CheckCircle2, Clock3, Sparkles, Settings2, Info } from "lucide-react";
import { IconBox } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";

export const settingsGroups = [
  { title: "组织与成员", icon: Users, tone: "blue" as const, links: [{ label: "成员管理", href: "/settings/users", detail: "工作组成员与账号状态" }, { label: "角色与权限", href: "/settings/roles", detail: "角色授权与业务权限" }] },
  { title: "价格基础", icon: Database, tone: "cyan" as const, links: [{ label: "基础数据字典", href: "/settings/dictionaries", detail: "设备分类、地材分类、单位、币种" }], unavailable: "汇率维护、地区配置：暂无独立配置入口" },
  { title: "AI 与审核", icon: Bot, tone: "purple" as const, links: [{ label: "AI 规则设置", href: "/settings/ai", detail: "模型、提示词与审核门禁" }, { label: "AI 配置审计", href: "/settings/ai/audit-logs", detail: "配置变更与生效记录" }] },
  { title: "采集与集成", icon: Cable, tone: "green" as const, links: [{ label: "外部集成与采集来源", href: "/settings/integrations", detail: "来源白名单、API 凭据与邮件连接" }, { label: "采集任务与周期", href: "/ai-price-collection", detail: "任务范围、执行频率与运行结果" }] },
  { title: "运维与审计", icon: History, tone: "orange" as const, links: [{ label: "操作日志", href: "/settings/logs", detail: "业务操作与配置变更" }, { label: "自动化运行", href: "/ai-workbench", detail: "运行矩阵、失败事件与人工审核" }], unavailable: "自动归档策略：暂无独立配置入口" },
];
const roles: Record<string, string> = { admin: "管理员", manager: "经理", editor: "编辑人员", reviewer: "审核人员", viewer: "只读成员" };
const groupDescriptions = ["工作组成员与账号状态管理", "分类、单位与币种等基础配置", "模型、提示词与人工审核规则", "外部平台与采集任务配置", "系统运行与业务操作追溯"];
const groupIds = ["organization", "price-data", "ai-review", "integrations", "operations"];
const groupColors = { blue: "text-primary", cyan: "text-cyan", purple: "text-ai", green: "text-success", orange: "text-warning" };

const groupSurfaces = {
  blue: "border-primary/20 bg-primary-soft text-primary",
  cyan: "border-cyan/20 bg-cyan-soft text-cyan",
  purple: "border-ai/20 bg-ai-soft text-ai",
  green: "border-success/20 bg-success-soft text-success",
  orange: "border-warning/20 bg-warning-soft text-warning",
};
const groupBorders = {
  blue: "border-primary/25", cyan: "border-cyan/25", purple: "border-ai/25",
  green: "border-success/25", orange: "border-warning/25",
};

export function SettingsHome({ organization, role, error, checkedAt, recovery }: {
  organization: { name: string; code: string } | null; role: string;
  error: string; checkedAt: string; recovery?: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 space-y-4 antialiased" data-no-global-interaction>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-primary/15 bg-gradient-to-r from-primary-soft via-white to-cyan-soft/50 px-5 py-4">
        <div className="space-y-1.5">
          <h1 className="text-page-title font-semibold tracking-tight text-textMain">系统设置</h1>
          <p className="text-page-subtitle text-textMuted">管理工作组、业务规则与系统连接</p>
        </div>
        <a href="/settings" aria-label="刷新工作组状态" title="刷新工作组状态" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/20 bg-white px-4 text-[13px] font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <RefreshCw className="size-4" />刷新状态
        </a>
      </header>
      {error ? <section role="alert" className="flex flex-wrap items-start gap-3 rounded-card border border-warning/30 bg-warning/10 p-4 text-[13px] text-textMain"><AlertTriangle className="size-5 shrink-0 text-warning" /><div className="min-w-0 flex-1 space-y-2 break-words"><p>{error}</p>{recovery}</div></section> : null}
      <section aria-label="当前工作组状态" className="rounded-card border border-primary/15 bg-gradient-to-r from-white to-primary-soft/40 px-5 py-4 shadow-[0_3px_16px_rgba(15,42,76,0.04)]">
        <dl className="grid items-center gap-5 text-[14px] sm:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_1fr_1.1fr]">
          <div className="flex min-w-0 items-center gap-3">
            <IconBox icon={Building2} size="lg" />
            <div className="min-w-0"><dt className="text-[12px] text-textMuted">当前工作组</dt><dd className="mt-1 break-words text-[15px] font-semibold text-textMain">{organization?.name || "未读取"}</dd>{organization ? <dd className="mt-1.5 break-all text-[12px] tracking-wide text-textMuted">{organization.code}</dd> : null}</div>
          </div>
          <div className="xl:border-l xl:border-borderSoft xl:pl-5"><dt className="flex items-center gap-2 text-[12px] text-textMuted"><ShieldCheck className="size-4 text-primary" />当前角色</dt><dd className="mt-2 font-semibold text-textMain">{roles[role] || "未读取"}</dd></div>
          <div className="xl:border-l xl:border-borderSoft xl:pl-5"><dt className="flex items-center gap-2 text-[12px] text-textMuted"><CheckCircle2 className={`size-4 ${organization ? "text-success" : "text-warning"}`} />组织访问</dt><dd className={`mt-2 inline-flex items-center gap-2 text-[13px] font-semibold ${organization ? "text-success" : "text-warning"}`}><span className={`size-1.5 rounded-full ${organization ? "bg-success" : "bg-warning"}`} />{organization ? "工作组读取成功" : "暂不可用"}</dd></div>
          <div className="xl:border-l xl:border-borderSoft xl:pl-5"><dt className="flex items-center gap-2 text-[12px] text-textMuted"><Clock3 className="size-4 text-primary" />最近检查（北京时间）</dt><dd className="mt-2 text-[13px] tabular-nums text-textSecondary">{checkedAt}</dd></div>
        </dl>
      </section>
      <div className="min-w-0 space-y-4">
        <nav aria-label="设置导航" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-primary/15 bg-white px-4 py-3">
          <ModuleHeader icon={Settings2} title="设置导航" density="compact" className="px-1" />
          <ul className="flex flex-wrap gap-2">
            {settingsGroups.map((group, index) => <li key={group.title}><a href={`#settings-${groupIds[index]}`} className={`flex min-h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary ${groupSurfaces[group.tone]}`}><group.icon className={`size-[18px] shrink-0 ${groupColors[group.tone]}`} />{group.title}</a></li>)}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">
          <nav aria-label="设置分类" className="grid gap-4 min-[1800px]:grid-cols-2">
            {settingsGroups.map((group, index) => (
              <section id={`settings-${groupIds[index]}`} key={group.title} className={`min-w-0 scroll-mt-24 rounded-card border bg-white px-5 py-4 shadow-[0_3px_16px_rgba(15,42,76,0.04)] transition-shadow hover:shadow-[0_6px_24px_rgba(15,42,76,0.07)] motion-reduce:transition-none sm:px-6 target:ring-2 target:ring-primary/25 ${groupBorders[group.tone]} ${index === settingsGroups.length - 1 ? "min-[1800px]:col-span-2" : ""}`}>
                <div className={`-mx-5 -mt-4 flex flex-wrap items-center justify-between gap-2 rounded-t-[inherit] border-b px-5 py-3 sm:-mx-6 sm:px-6 ${groupSurfaces[group.tone]}`}>
                  <div className="flex min-w-0 items-center gap-3.5">
                    <IconBox icon={group.icon} tone={group.tone} size="lg" className="shadow-none" />
                    <div className="min-w-0"><h2 className="text-[16px] font-semibold leading-6 tracking-[0.01em] text-textMain">{group.title}</h2><p className="mt-1 text-[13px] leading-5 text-textMuted">{groupDescriptions[index]}</p></div>
                  </div>
                  {group.tone === "purple" ? <span className="inline-flex items-center gap-1 rounded-pill border border-ai/15 bg-ai-soft px-2 py-1 text-[12px] text-ai"><ShieldCheck className="size-3" />人工复核</span> : null}
                </div>
                <ul className={`grid pt-3 ${group.links.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {group.links.map((link, linkIndex) => <li key={link.href} className={`min-w-0 ${linkIndex > 0 ? "border-t border-borderSoft sm:border-l sm:border-t-0 sm:pl-2" : "sm:pr-2"}`}><Link href={link.href} className="group flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="min-w-0 flex-1"><span className="block break-words text-[15px] font-medium text-textMain">{link.label}</span><span className="mt-1.5 block break-words text-[13px] leading-[22px] text-textMuted">{link.detail}</span></span><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white"><ArrowRight className="size-3.5" /></span></Link></li>)}
                </ul>
                {group.unavailable ? <p className="mt-2 flex items-start gap-2 px-3 text-[12px] leading-5 text-textMuted"><Info className="mt-0.5 size-3.5 shrink-0" />{group.unavailable}</p> : null}
              </section>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ai/15 bg-ai-soft/60 px-4 py-3 text-[13px] leading-6 text-ai">
            <p className="flex items-start gap-2"><Sparkles className="size-4 shrink-0" />AI 辅助识别与建议，关键业务判断由人工复核。</p>
            <Link href="/ai-workbench" className="inline-flex items-center gap-1 font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ai">前往 AI 工作台<ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
