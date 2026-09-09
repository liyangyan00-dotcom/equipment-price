"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileText,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "manager" | "reviewer" | "editor" | "viewer";
type AppPermission =
  | "supplier.read" | "supplier.write" | "supplier.review"
  | "price.read" | "price.write" | "price.review"
  | "inquiry.read" | "inquiry.write" | "inquiry.approve"
  | "project.read" | "project.write" | "report.read" | "report.write"
  | "file.read" | "file.write" | "file.delete" | "audit.read" | "settings.manage" | "user.manage";

type RoleRow = { role: AppRole; memberCount: number; defaultPermissions: AppPermission[]; permissions: AppPermission[]; customized: boolean; overrideCount: number };
type AuditRow = { id: number; action: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string; actor_id: string | null };
type RolesResponse = { organization: { name: string } | null; roles: RoleRow[]; audits: AuditRow[] };
type OrganizationUser = { userId: string; displayName: string; email: string | null; phone: string | null; role: AppRole; isActive: boolean; lastSignInAt: string | null };

const validRoles: AppRole[] = ["admin", "manager", "reviewer", "editor", "viewer"];
const roleMeta: Record<AppRole, { label: string; description: string; responsibility: string; tone: string; icon: typeof Shield }> = {
  admin: { label: "系统管理员", description: "拥有全部系统、用户与安全管理权限", responsibility: "维护组织、账号、权限边界与系统配置，对高风险配置变更负责。", tone: "border-purple-200 bg-purple-50 text-ai", icon: ShieldCheck },
  manager: { label: "业务负责人", description: "统筹业务数据、审核审批和项目协同", responsibility: "负责价格、供应商、询价与项目套价的业务审批和跨团队协调。", tone: "border-blue-200 bg-blue-50 text-primary", icon: UserCog },
  reviewer: { label: "审核员", description: "复核价格、供应商、询价与 AI 结果", responsibility: "对 AI 结论、价格来源、风险项和入库条件执行独立人工复核。", tone: "border-orange-200 bg-orange-50 text-warning", icon: BadgeCheck },
  editor: { label: "业务编辑", description: "维护价格、询价、项目、报告和附件", responsibility: "维护业务数据和证据文件，但不替代审批人与审核员作最终判断。", tone: "border-cyan-200 bg-cyan-50 text-cyan-700", icon: SlidersHorizontal },
  viewer: { label: "只读成员", description: "查看授权业务数据，不执行修改操作", responsibility: "用于查阅价格情报、供应商和报告，不允许修改、审核或删除数据。", tone: "border-slate-200 bg-slate-50 text-slate-600", icon: Eye },
};

const permissionLabels: Record<AppPermission, string> = {
  "supplier.read": "查看供应商", "supplier.write": "维护供应商", "supplier.review": "审核供应商",
  "price.read": "查看价格", "price.write": "维护价格", "price.review": "审核价格",
  "inquiry.read": "查看询价", "inquiry.write": "维护询价", "inquiry.approve": "审批询价",
  "project.read": "查看项目套价", "project.write": "维护项目套价",
  "report.read": "查看报告", "report.write": "生成报告",
  "file.read": "查看附件", "file.write": "上传附件", "file.delete": "删除附件",
  "audit.read": "查看审计日志", "settings.manage": "管理系统设置", "user.manage": "管理用户",
};

const groups: Array<{ label: string; icon: typeof Shield; permissions: AppPermission[]; href: string }> = [
  { label: "供应商库", icon: Users, permissions: ["supplier.read", "supplier.write", "supplier.review"], href: "/suppliers" },
  { label: "价格库", icon: Database, permissions: ["price.read", "price.write", "price.review"], href: "/equipment-prices" },
  { label: "询价与比价", icon: BadgeCheck, permissions: ["inquiry.read", "inquiry.write", "inquiry.approve"], href: "/inquiries" },
  { label: "项目套价", icon: SlidersHorizontal, permissions: ["project.read", "project.write"], href: "/project-pricing" },
  { label: "报告中心", icon: FileText, permissions: ["report.read", "report.write"], href: "/ai-report-center" },
  { label: "附件证据", icon: KeyRound, permissions: ["file.read", "file.write", "file.delete"], href: "/attachments" },
  { label: "系统与安全", icon: LockKeyhole, permissions: ["audit.read", "settings.manage", "user.manage"], href: "/settings" },
];

function formatDate(value: string | null) {
  if (!value) return "尚未登录";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export default function RoleDetailPage() {
  const params = useParams<{ role: string }>();
  const role = validRoles.includes(params.role as AppRole) ? params.role as AppRole : null;
  const [rolesData, setRolesData] = useState<RolesResponse | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(Boolean(role));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/settings/roles", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "角色读取失败"); return payload as RolesResponse; }),
      fetch("/api/settings/users", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "成员读取失败"); return payload.data as OrganizationUser[]; }),
    ]).then(([roleResponse, memberResponse]) => { if (!cancelled) { setRolesData(roleResponse); setUsers(memberResponse); setError(""); } }).catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : String(requestError)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role]);

  const current = rolesData?.roles.find((item) => item.role === role) ?? null;
  const members = useMemo(() => users.filter((user) => user.role === role), [role, users]);
  const audits = useMemo(() => rolesData?.audits.filter((audit) => (audit.new_data ?? audit.old_data)?.role === role) ?? [], [role, rolesData]);
  const activeMembers = members.filter((member) => member.isActive).length;

  if (!role) {
    return <AppLayout><EmptyState title="角色不存在" description="该角色不属于当前系统固定角色层级。" primaryAction={<Link href="/settings/roles" className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white">返回角色权限</Link>} /></AppLayout>;
  }
  const meta = roleMeta[role];
  const RoleIcon = meta.icon;

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader title={`${meta.label}详情`} description={`查看 ${rolesData?.organization?.name ?? "当前组织"} 中该角色的成员归属、有效权限、业务影响和变更历史。`} actions={<><Link href={`/settings/roles?role=${role}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary hover:border-primary hover:text-primary"><ChevronLeft className="size-4" />权限矩阵</Link><Link href="/settings/users" className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"><Users className="size-4" />成员管理</Link><Link href={`/settings/logs?table=wpi_organization_role_permissions&role=${role}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai"><Activity className="size-4" />权限审计</Link></>} />

        {loading ? <section className="rounded-card border border-borderSoft bg-white py-24 text-center shadow-card"><RefreshCw className="mx-auto size-6 animate-spin text-primary" /><p className="mt-3 text-[12px] text-textMuted">正在读取角色详情...</p></section> : error ? <EmptyState title="角色详情加载失败" description={error} /> : current ? <>
          <section className="grid gap-3 rounded-card border border-borderSoft bg-white p-4 shadow-card xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(130px,0.55fr))]">
            <div className="flex items-center gap-4"><span className={cn("flex size-14 shrink-0 items-center justify-center rounded-[16px] border", meta.tone)}><RoleIcon className="size-7" /></span><div><div className="flex items-center gap-2"><h1 className="text-[20px] font-bold text-textMain">{meta.label}</h1><span className={cn("rounded-pill px-2 py-1 text-[10px] font-semibold", current.customized ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{current.customized ? "组织自定义" : "继承默认"}</span></div><p className="mt-1 text-[12px] text-textMuted">{meta.description}</p><p className="mt-2 max-w-2xl text-[11px] leading-5 text-textSecondary">{meta.responsibility}</p></div></div>
            {[["启用成员", activeMembers, Users, "text-primary bg-primary-soft"], ["有效权限", current.permissions.length, KeyRound, "text-ai bg-ai-soft"], ["组织覆盖", current.overrideCount, SlidersHorizontal, "text-warning bg-warning-soft"], ["近期变更", audits.length, Activity, "text-success bg-success-soft"]].map(([label, value, icon, tone]) => { const Icon = icon as typeof Users; return <div key={String(label)} className="rounded-[12px] border border-borderSoft bg-slate-50 p-3"><span className={cn("flex size-8 items-center justify-center rounded-[10px]", String(tone))}><Icon className="size-4" /></span><p className="mt-3 text-[11px] text-textMuted">{String(label)}</p><p className="mt-1 text-[22px] font-bold text-textMain">{String(value)}</p></div>; })}
          </section>

          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[14px] font-semibold text-textMain">有效权限与业务范围</h2><p className="text-[11px] text-textMuted">展示当前组织覆盖计算后的最终权限</p></div><Link href={`/settings/roles?role=${role}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">调整权限<ChevronRight className="size-3.5" /></Link></div><div className="grid gap-3 p-4 md:grid-cols-2">{groups.map((group) => { const GroupIcon = group.icon; const enabled = group.permissions.filter((permission) => current.permissions.includes(permission)); return <div key={group.label} className="rounded-[12px] border border-borderSoft bg-slate-50 p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[10px] bg-white text-primary shadow-sm"><GroupIcon className="size-4" /></span><div><p className="text-[12px] font-semibold text-textMain">{group.label}</p><p className="text-[9px] text-textMuted">{enabled.length} / {group.permissions.length} 项授权</p></div></div>{enabled.some((permission) => permission.endsWith(".read")) ? <Link href={group.href} className="text-[10px] font-semibold text-primary">进入业务</Link> : null}</div><div className="mt-3 flex flex-wrap gap-1.5">{group.permissions.map((permission) => <span key={permission} className={cn("inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-[10px] font-semibold", current.permissions.includes(permission) ? "border-success/20 bg-success-soft text-success" : "border-slate-200 bg-white text-textMuted")}><Check className={cn("size-3", !current.permissions.includes(permission) && "opacity-25")} />{permissionLabels[permission]}</span>)}</div></div>; })}</div></section>

            <aside className="space-y-3"><section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[11px] bg-ai text-white"><ShieldCheck className="size-4" /></span><div><h2 className="text-[14px] font-semibold text-textMain">权限影响结论</h2><p className="text-[11px] text-textMuted">基于当前有效权限实时计算</p></div></div><div className="mt-3 space-y-2 text-[11px]"><p className="rounded-[10px] border border-white bg-white/80 p-3 leading-5 text-textSecondary">该角色当前影响 <strong className="text-primary">{activeMembers}</strong> 名启用成员，可访问 {groups.filter((group) => group.permissions.some((permission) => current.permissions.includes(permission))).length} 个业务域。</p><p className="rounded-[10px] border border-warning/20 bg-warning-soft p-3 leading-5 text-textSecondary"><strong className="text-warning">人工审核边界：</strong>角色授权只控制操作资格，AI 结果、价格审批和供应商准入仍必须执行人工确认。</p></div></section><section className="rounded-card border border-borderSoft bg-white p-4 shadow-card"><div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold text-textMain">权限变更摘要</h2><Link href={`/settings/logs?table=wpi_organization_role_permissions&role=${role}`} className="text-[10px] font-semibold text-primary">查看全部</Link></div><div className="mt-3 space-y-2">{audits.length ? audits.slice(0, 6).map((audit) => <div key={audit.id} className="flex gap-2 rounded-[10px] border border-borderSoft bg-slate-50 p-2.5"><span className={cn("mt-1 size-2 shrink-0 rounded-full", audit.action === "delete" ? "bg-warning" : "bg-primary")} /><div><p className="text-[11px] font-semibold text-textSecondary">{audit.action === "delete" ? "恢复默认模板" : "调整组织权限"}</p><p className="mt-0.5 text-[10px] text-textMuted">{formatDate(audit.created_at)}</p></div></div>) : <p className="rounded-[10px] bg-slate-50 px-3 py-6 text-center text-[11px] text-textMuted">暂无该角色权限变更</p>}</div></section></aside>
          </div>

          <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[14px] font-semibold text-textMain">角色成员</h2><p className="text-[11px] text-textMuted">角色调整统一在成员管理页完成，避免权限和账号状态分散修改</p></div><Link href="/settings/users" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-semibold text-primary"><Users className="size-3.5" />管理成员</Link></div>{members.length ? <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-[11px]"><thead className="h-10 bg-[#F7FAFE] text-textSecondary"><tr><th className="px-4">成员</th><th className="px-3">邮箱</th><th className="px-3">联系电话</th><th className="px-3">账号状态</th><th className="px-3">最近登录</th></tr></thead><tbody className="divide-y divide-borderSoft">{members.map((member) => <tr key={member.userId} className="h-12 hover:bg-primary-soft/30"><td className="px-4"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[10px] bg-primary-soft font-bold text-primary">{member.displayName.slice(0, 1).toUpperCase()}</span><div><p className="font-semibold text-textMain">{member.displayName}</p><code className="text-[9px] text-textMuted">{member.userId.slice(0, 8)}</code></div></div></td><td className="px-3 text-textSecondary">{member.email ?? "未登记"}</td><td className="px-3 text-textSecondary">{member.phone ?? "未登记"}</td><td className="px-3"><span className={cn("rounded-pill px-2 py-1 text-[10px] font-semibold", member.isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>{member.isActive ? "启用" : "停用"}</span></td><td className="px-3 text-textSecondary">{formatDate(member.lastSignInAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="该角色暂无成员" description="可前往成员管理页邀请成员或调整现有成员角色。" className="m-4 shadow-none" primaryAction={<Link href="/settings/users" className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white">进入成员管理</Link>} />}</section>
        </> : <EmptyState title="未找到角色配置" description="当前组织没有返回该角色的权限矩阵。" />}
      </div>
    </AppLayout>
  );
}
