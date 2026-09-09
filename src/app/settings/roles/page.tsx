"use client";
import { useUnsavedSettings } from "@/hooks/useUnsavedSettings";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Eye,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingButton } from "@/components/common/LoadingButton";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "manager" | "reviewer" | "editor" | "viewer";
type AppPermission =
  | "supplier.read" | "supplier.write" | "supplier.review"
  | "price.read" | "price.write" | "price.review"
  | "inquiry.read" | "inquiry.write" | "inquiry.approve"
  | "project.read" | "project.write"
  | "report.read" | "report.write"
  | "file.read" | "file.write" | "file.delete"
  | "audit.read" | "settings.manage" | "user.manage";

type RoleRow = {
  role: AppRole;
  memberCount: number;
  defaultPermissions: AppPermission[];
  permissions: AppPermission[];
  customized: boolean;
  overrideCount: number;
};

type AuditRow = {
  id: number;
  action: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
};

type RolesResponse = {
  organization: { id: string; code: string; name: string } | null;
  currentRole: AppRole;
  roles: RoleRow[];
  permissions: AppPermission[];
  protectedPermissions: AppPermission[];
  audits: AuditRow[];
};

const roleMeta: Record<AppRole, { label: string; description: string; tone: string; icon: typeof Shield }> = {
  admin: { label: "系统管理员", description: "拥有全部系统、用户与安全管理权限", tone: "border-purple-200 bg-purple-50 text-ai", icon: ShieldCheck },
  manager: { label: "业务负责人", description: "统筹业务数据、审核审批和项目协同", tone: "border-blue-200 bg-blue-50 text-primary", icon: UserCog },
  reviewer: { label: "审核员", description: "复核价格、供应商、询价与 AI 结果", tone: "border-orange-200 bg-orange-50 text-warning", icon: BadgeCheck },
  editor: { label: "业务编辑", description: "维护价格、询价、项目、报告和附件", tone: "border-cyan-200 bg-cyan-50 text-cyan-700", icon: SlidersHorizontal },
  viewer: { label: "只读成员", description: "查看授权业务数据，不执行修改操作", tone: "border-slate-200 bg-slate-50 text-slate-600", icon: Eye },
};

const permissionMeta: Record<AppPermission, { label: string; description: string }> = {
  "supplier.read": { label: "查看供应商", description: "读取供应商档案、联系人和评估信息" },
  "supplier.write": { label: "维护供应商", description: "新增、编辑和补全供应商资料" },
  "supplier.review": { label: "审核供应商", description: "执行供应商准入与风险复核" },
  "price.read": { label: "查看价格", description: "读取设备与地材价格数据" },
  "price.write": { label: "维护价格", description: "新增、编辑、导入和采集价格" },
  "price.review": { label: "审核价格", description: "执行人工审核、驳回与确认入库" },
  "inquiry.read": { label: "查看询价", description: "读取询价任务与供应商响应" },
  "inquiry.write": { label: "维护询价", description: "创建、编辑和发送询价任务" },
  "inquiry.approve": { label: "审批询价", description: "确认比价方案与询价审批结论" },
  "project.read": { label: "查看项目套价", description: "读取 BOQ、套价方案和价格缺口" },
  "project.write": { label: "维护项目套价", description: "解析 BOQ、修正匹配并生成套价" },
  "report.read": { label: "查看报告", description: "读取报告任务和预览结果" },
  "report.write": { label: "生成报告", description: "创建报告任务并维护报告配置" },
  "file.read": { label: "查看附件", description: "读取附件与证据链文件" },
  "file.write": { label: "上传附件", description: "上传、归档和关联业务文件" },
  "file.delete": { label: "删除附件", description: "删除组织内附件和证据文件" },
  "audit.read": { label: "查看审计日志", description: "查看组织内数据和权限变更记录" },
  "settings.manage": { label: "管理系统设置", description: "修改组织级系统配置，仅管理员可用" },
  "user.manage": { label: "管理用户", description: "邀请、停用成员和调整角色，仅管理员可用" },
};

const permissionGroups: Array<{ id: string; label: string; description: string; icon: typeof Shield; permissions: AppPermission[] }> = [
  { id: "supplier", label: "供应商库", description: "供应商档案、准入与风险复核", icon: Users, permissions: ["supplier.read", "supplier.write", "supplier.review"] },
  { id: "price", label: "价格库", description: "设备、地材价格维护与审核", icon: Database, permissions: ["price.read", "price.write", "price.review"] },
  { id: "inquiry", label: "询价与比价", description: "询价任务、响应与方案审批", icon: BadgeCheck, permissions: ["inquiry.read", "inquiry.write", "inquiry.approve"] },
  { id: "project", label: "项目套价", description: "BOQ 解析和项目价格方案", icon: SlidersHorizontal, permissions: ["project.read", "project.write"] },
  { id: "report", label: "报告中心", description: "报告查看、生成和配置", icon: Activity, permissions: ["report.read", "report.write"] },
  { id: "file", label: "附件证据", description: "文件读取、上传和删除", icon: KeyRound, permissions: ["file.read", "file.write", "file.delete"] },
  { id: "security", label: "系统与安全", description: "审计、设置和用户管理", icon: LockKeyhole, permissions: ["audit.read", "settings.manage", "user.manage"] },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function apiRequest<T>(init?: RequestInit) {
  const response = await fetch("/api/settings/roles", {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

function PermissionSwitch({ enabled, disabled, onClick }: { enabled: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-55", enabled ? "bg-primary" : "bg-slate-300")}
    >
      <span className={cn("absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all", enabled ? "left-6" : "left-1")} />
    </button>
  );
}

function StatCard({ label, value, note, icon: Icon, tone, href }: { label: string; value: number; note: string; icon: typeof Shield; tone: "blue" | "purple" | "green" | "orange" | "cyan"; href?: string }) {
  const tones = {
    blue: "border-blue-100 from-white to-blue-50 text-primary",
    purple: "border-purple-100 from-white to-purple-50 text-ai",
    green: "border-emerald-100 from-white to-emerald-50 text-success",
    orange: "border-orange-100 from-white to-orange-50 text-warning",
    cyan: "border-cyan-100 from-white to-cyan-50 text-cyan-600",
  };
  const card = (
    <section className={cn("rounded-card border bg-gradient-to-br p-3.5 shadow-card transition", tones[tone], href && "hover:-translate-y-0.5 hover:shadow-card-hover")}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold">{label}</p><p className="mt-1 text-[25px] font-bold leading-none">{value}</p><p className="mt-2 text-[11px] text-textMuted">{note}</p></div><span className="flex size-10 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Icon className="size-5" /></span></div>
    </section>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function SettingsRolesPage() {
  const toast = useMockToast();
  const [response, setResponse] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("manager");
  const [draft, setDraft] = useState<AppPermission[]>([]);
  const [search, setSearch] = useState("");
  const [copyFrom, setCopyFrom] = useState<AppRole>("reviewer");
  const [pendingAction, setPendingAction] = useState<"save" | "reset" | null>(null);
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  const loadRoles = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await apiRequest<RolesResponse>();
      setResponse(data);
      const selected = data.roles.find((item) => item.role === selectedRole) ?? data.roles.find((item) => item.role === "manager") ?? data.roles[0];
      if (selected) {
        setSelectedRole(selected.role);
        setDraft(selected.permissions);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<RolesResponse>({ cache: "no-store" })
      .then((data) => {
        if (cancelled) return;
        setResponse(data);
        const requestedRole = new URLSearchParams(window.location.search).get("role");
        const selected = data.roles.find((item) => item.role === requestedRole) ?? data.roles.find((item) => item.role === "manager") ?? data.roles[0];
        if (selected) {
          setSelectedRole(selected.role);
          setDraft(selected.permissions);
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = response?.roles.find((item) => item.role === selectedRole) ?? null;
  const draftSet = useMemo(() => new Set(draft), [draft]);
  const protectedSet = useMemo(() => new Set(response?.protectedPermissions ?? []), [response]);
  const isDirty = useMemo(() => {
    if (!current) return false;
    const original = new Set(current.permissions);
    return original.size !== draftSet.size || [...original].some((permission) => !draftSet.has(permission));
  }, [current, draftSet]);

  useUnsavedSettings(isDirty, saving);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return permissionGroups;
    return permissionGroups
      .map((group) => ({ ...group, permissions: group.permissions.filter((permission) => `${permissionMeta[permission].label}${permissionMeta[permission].description}${permission}`.toLowerCase().includes(keyword)) }))
      .filter((group) => group.permissions.length);
  }, [search]);

  const stats = useMemo(() => ({
    roles: response?.roles.length ?? 0,
    permissions: response?.permissions.length ?? 0,
    members: response?.roles.reduce((sum, role) => sum + role.memberCount, 0) ?? 0,
    customized: response?.roles.filter((role) => role.customized).length ?? 0,
    audits: response?.audits.length ?? 0,
  }), [response]);

  const activateRole = (role: AppRole) => {
    const next = response?.roles.find((item) => item.role === role);
    setSelectedRole(role);
    setDraft(next?.permissions ?? []);
    const url = new URL(window.location.href);
    url.searchParams.set("role", role);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const selectRole = (role: AppRole) => {
    if (role === selectedRole) return;
    if (isDirty) {
      setPendingRole(role);
      return;
    }
    activateRole(role);
  };

  const togglePermission = (permission: AppPermission) => {
    if (selectedRole === "admin" || protectedSet.has(permission)) return;
    setDraft((currentDraft) => currentDraft.includes(permission) ? currentDraft.filter((item) => item !== permission) : [...currentDraft, permission]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest<{ ok: boolean }>({ method: "PATCH", body: JSON.stringify({ role: selectedRole, permissions: draft }) });
      toast.success("角色权限已保存", `${roleMeta[selectedRole].label}的组织级权限已立即生效，并已写入审计日志。`);
      setPendingAction(null);
      await loadRoles(true);
    } catch (requestError) {
      toast.danger("保存失败", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await apiRequest<{ ok: boolean }>({ method: "DELETE", body: JSON.stringify({ role: selectedRole }) });
      toast.success("已恢复默认权限", `${roleMeta[selectedRole].label}已重新继承系统默认角色模板。`);
      setPendingAction(null);
      await loadRoles(true);
    } catch (requestError) {
      toast.danger("恢复失败", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const copyRole = () => {
    if (selectedRole === "admin") return;
    const source = response?.roles.find((role) => role.role === copyFrom);
    if (!source) return;
    setDraft(source.permissions.filter((permission) => !protectedSet.has(permission)));
    toast.info("已复制权限模板", `已将${roleMeta[copyFrom].label}权限复制到当前草稿，保存后才会生效。`);
  };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="角色权限管理"
          description={`配置 ${response?.organization?.name ?? "当前组织"} 的角色权限矩阵。权限变更即时受 RLS 控制，并自动进入审计日志。`}
          actions={<><Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary hover:border-primary hover:text-primary"><ChevronLeft className="size-4" />系统设置</Link><Link href="/settings/users" className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"><Users className="size-4" />成员管理</Link><Link href="/settings/logs?table=wpi_organization_role_permissions" className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai"><Activity className="size-4" />权限审计</Link><button type="button" onClick={() => void loadRoles()} className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-primary" title="刷新权限"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button></>}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="系统角色" value={stats.roles} note="固定角色层级" icon={Shield} tone="blue" />
          <StatCard label="权限点" value={stats.permissions} note="覆盖核心业务域" icon={KeyRound} tone="purple" />
          <StatCard label="启用成员" value={stats.members} note="按当前角色归属" icon={Users} tone="green" href="/settings/users" />
          <StatCard label="自定义角色" value={stats.customized} note="存在组织级覆盖" icon={Settings2} tone="orange" />
          <StatCard label="近期权限变更" value={stats.audits} note="进入完整审计日志" icon={Activity} tone="cyan" href="/settings/logs?table=wpi_organization_role_permissions" />
        </div>

        {error ? (
          <section className="rounded-card border border-danger/20 bg-danger-soft p-5 text-center"><p className="text-[13px] font-semibold text-danger">权限数据加载失败</p><p className="mt-1 text-[12px] text-textSecondary">{error}</p><button type="button" onClick={() => void loadRoles()} className="mt-3 h-8 rounded-md bg-danger px-4 text-[12px] font-semibold text-white">重新加载</button></section>
        ) : loading && !response ? (
          <section className="rounded-card border border-borderSoft bg-white py-20 text-center shadow-card"><RefreshCw className="mx-auto size-6 animate-spin text-primary" /><p className="mt-3 text-[12px] text-textMuted">正在读取角色与权限矩阵...</p></section>
        ) : response ? (
          <div className="grid min-w-0 gap-3 xl:grid-cols-[230px_minmax(0,1fr)_290px]">
            <aside className="space-y-2 rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <div className="mb-3 flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[11px] bg-primary-soft text-primary"><Users className="size-4" /></span><div><h2 className="text-[14px] font-semibold text-textMain">角色目录</h2><p className="text-[11px] text-textMuted">选择角色配置权限</p></div></div>
              {response.roles.map((role) => {
                const meta = roleMeta[role.role];
                const Icon = meta.icon;
                const active = role.role === selectedRole;
                return <button key={role.role} type="button" aria-pressed={active} title={`切换到${meta.label}权限矩阵`} onClick={() => selectRole(role.role)} className={cn("w-full rounded-[11px] border p-3 text-left transition", active ? "border-primary bg-primary-soft shadow-[inset_3px_0_0_#2F6BFF]" : "border-borderSoft bg-white hover:border-primary/30 hover:bg-slate-50")}><div className="flex items-start gap-2.5"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] border", meta.tone)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="font-semibold text-textMain">{meta.label}</span><span className="text-[11px] font-semibold text-primary">{role.memberCount} 人</span></span><span className="mt-1 block text-[11px] leading-4 text-textMuted">{meta.description}</span><span className="mt-2 flex items-center gap-1.5 text-[10px]"><span className={cn("rounded-pill px-2 py-0.5 font-semibold", role.customized ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{role.customized ? "组织自定义" : "系统默认"}</span><span className="text-textMuted">{role.permissions.length} 项权限</span></span></span></div></button>;
              })}
              <div className="mt-3 rounded-[10px] border border-ai-border bg-ai-soft p-3 text-[11px] leading-5 text-textSecondary"><p className="font-semibold text-ai">权限原则</p><p className="mt-1">角色决定可执行动作，不能替代价格、供应商和 AI 结果的人工审核结论。</p></div>
            </aside>

            <main className="min-w-0 space-y-3">
              <section className="rounded-card border border-borderSoft bg-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft px-4 py-3"><div className="flex items-center gap-3"><span className={cn("flex size-10 items-center justify-center rounded-[12px] border", roleMeta[selectedRole].tone)}>{(() => { const Icon = roleMeta[selectedRole].icon; return <Icon className="size-5" />; })()}</span><div><div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold text-textMain">{roleMeta[selectedRole].label}</h2>{current?.customized ? <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">组织自定义</span> : <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">继承默认</span>}{isDirty ? <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">有未保存修改</span> : null}</div><p className="mt-0.5 text-[11px] text-textMuted">{roleMeta[selectedRole].description} · 当前 {current?.memberCount ?? 0} 名启用成员</p></div></div><div className="flex flex-wrap items-center gap-2"><Link href={`/settings/roles/${selectedRole}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-semibold text-primary"><Eye className="size-3.5" />角色详情</Link><select aria-label="复制角色模板" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value as AppRole)} disabled={selectedRole === "admin"} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary">{response.roles.filter((role) => role.role !== selectedRole).map((role) => <option key={role.role} value={role.role}>复制：{roleMeta[role.role].label}</option>)}</select><button type="button" onClick={copyRole} disabled={selectedRole === "admin"} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary disabled:opacity-40"><Copy className="size-3.5" />复制模板</button><button type="button" onClick={() => setPendingAction("reset")} disabled={selectedRole === "admin" || !current?.customized || saving} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-warning/20 bg-warning-soft px-3 text-[11px] font-semibold text-warning disabled:opacity-40"><RotateCcw className="size-3.5" />恢复默认</button><LoadingButton loading={saving} disabled={selectedRole === "admin" || !isDirty} icon={<Save className="size-4" />} onClick={() => setPendingAction("save")}>保存权限</LoadingButton></div></div>
                <div className="border-b border-borderSoft bg-slate-50/70 px-4 py-2.5"><div className="relative max-w-[420px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索权限名称、说明或权限代码" className="h-9 w-full rounded-md border border-borderSoft bg-white pl-9 pr-3 text-[12px] outline-none focus:border-primary" /></div></div>
                <div className="grid gap-3 p-3 2xl:grid-cols-2">
                  {filteredGroups.length ? filteredGroups.map((group) => <section key={group.id} className="overflow-hidden rounded-[12px] border border-borderSoft bg-white"><div className="flex items-center gap-2 border-b border-borderSoft bg-[#F8FAFD] px-3 py-2.5"><span className="flex size-8 items-center justify-center rounded-[9px] bg-primary-soft text-primary"><group.icon className="size-4" /></span><div><h3 className="text-[12px] font-semibold text-textMain">{group.label}</h3><p className="text-[10px] text-textMuted">{group.description}</p></div></div><div className="divide-y divide-borderSoft">{group.permissions.map((permission) => { const enabled = draftSet.has(permission); const protectedPermission = protectedSet.has(permission); const locked = selectedRole === "admin" || protectedPermission; return <div key={permission} className={cn("flex min-h-[62px] items-center gap-3 px-3 py-2", enabled ? "bg-primary-soft/20" : "bg-white")}><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px]", enabled ? "bg-success-soft text-success" : "bg-slate-100 text-slate-400")}>{enabled ? <Check className="size-4" /> : <X className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-[12px] font-semibold text-textMain">{permissionMeta[permission].label}</p><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-textMuted">{permission}</code>{protectedPermission ? <span className="inline-flex items-center gap-1 rounded-pill bg-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-warning"><LockKeyhole className="size-2.5" />仅管理员</span> : null}</div><p className="mt-0.5 text-[10px] leading-4 text-textMuted">{permissionMeta[permission].description}</p></div><PermissionSwitch enabled={enabled} disabled={locked} onClick={() => togglePermission(permission)} /></div>; })}</div></section>) : <div className="2xl:col-span-2"><EmptyState title="没有匹配的权限" description="请调整搜索关键词后重试。" /></div>}
                </div>
              </section>

              <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[14px] font-semibold text-textMain">全角色权限对照</h2><p className="text-[11px] text-textMuted">快速核对各角色的有效权限，勾选表示当前已授权</p></div><Link href="/settings/users" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">查看成员归属<ChevronRight className="size-3.5" /></Link></div><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-[11px]"><thead className="bg-[#F7FAFE] text-textSecondary"><tr><th className="px-3 py-2.5">权限</th>{response.roles.map((role) => <th key={role.role} className="px-3 py-2.5 text-center">{roleMeta[role.role].label}<span className="ml-1 text-[9px] text-textMuted">({role.memberCount})</span></th>)}</tr></thead><tbody className="divide-y divide-borderSoft">{response.permissions.map((permission) => <tr key={permission} className="hover:bg-slate-50"><td className="px-3 py-2"><p className="font-semibold text-textMain">{permissionMeta[permission].label}</p><code className="text-[9px] text-textMuted">{permission}</code></td>{response.roles.map((role) => <td key={role.role} className="px-3 py-2 text-center">{role.permissions.includes(permission) ? <Check className="mx-auto size-4 text-success" /> : <span className="mx-auto block h-0.5 w-3 rounded bg-slate-200" />}</td>)}</tr>)}</tbody></table></div></section>
            </main>

            <aside className="space-y-3">
              <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[11px] bg-ai text-white"><ShieldCheck className="size-4" /></span><div><h2 className="text-[14px] font-semibold text-textMain">权限影响分析</h2><p className="text-[11px] text-textMuted">保存前的安全校验</p></div></div><div className="mt-3 space-y-2 text-[11px]"><div className="rounded-[10px] border border-white bg-white/85 p-3"><p className="font-semibold text-textMain">影响成员</p><p className="mt-1 text-textMuted">{current?.memberCount ?? 0} 名启用成员将在保存后立即获得新的有效权限。</p></div><div className="rounded-[10px] border border-white bg-white/85 p-3"><p className="font-semibold text-textMain">权限变化</p><p className="mt-1 text-textMuted">当前草稿 {draft.length} 项，系统默认 {current?.defaultPermissions.length ?? 0} 项。</p></div><div className="rounded-[10px] border border-warning/20 bg-warning-soft p-3 text-warning"><p className="font-semibold">人工审核边界</p><p className="mt-1 leading-5 text-textSecondary">授权只决定可执行动作，AI 结论仍须进入人工审核流程。</p></div></div></section>

              <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Activity className="size-4 text-primary" /><h2 className="text-[14px] font-semibold text-textMain">最近权限审计</h2></div><Link href={`/settings/logs?table=wpi_organization_role_permissions&role=${selectedRole}`} className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">{response.audits.length} 条<ChevronRight className="size-3" /></Link></div><div className="mt-3 space-y-2">{response.audits.length ? response.audits.slice(0, 8).map((audit) => { const data = audit.new_data ?? audit.old_data; const role = typeof data?.role === "string" ? data.role as AppRole : null; const permission = typeof data?.permission === "string" ? data.permission as AppPermission : null; return <Link href={`/settings/logs?table=wpi_organization_role_permissions&role=${role ?? selectedRole}`} key={audit.id} className="flex gap-2 rounded-[10px] border border-borderSoft bg-slate-50 p-2.5 transition hover:border-primary/30 hover:bg-primary-soft/30"><span className={cn("mt-1 size-2 shrink-0 rounded-full", audit.action === "delete" ? "bg-warning" : "bg-primary")} /><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-textSecondary">{audit.action === "delete" ? "恢复默认" : audit.action === "insert" ? "新增覆盖" : "调整权限"}{role ? ` · ${roleMeta[role]?.label ?? role}` : ""}</p><p className="mt-0.5 truncate text-[10px] text-textMuted">{permission && permissionMeta[permission] ? permissionMeta[permission].label : "权限配置"} · {formatDate(audit.created_at)}</p></div></Link>; }) : <p className="rounded-[10px] bg-slate-50 px-3 py-6 text-center text-[11px] text-textMuted">暂无组织级权限变更</p>}</div></section>

              <section className="rounded-card border border-warning/20 bg-warning-soft p-4"><div className="flex items-center gap-2 text-warning"><LockKeyhole className="size-4" /><h3 className="text-[13px] font-semibold">安全约束</h3></div><ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-textSecondary"><li>• 系统管理员始终拥有全部权限</li><li>• 用户管理和系统设置权限不可下放</li><li>• 权限覆盖仅作用于当前组织</li><li>• 保存和恢复默认均自动记录审计</li></ul></section>
            </aside>
          </div>
        ) : null}
      </div>

      <ConfirmDialog open={pendingAction === "save"} title="确认保存角色权限" description={`保存后，${roleMeta[selectedRole].label}下的 ${current?.memberCount ?? 0} 名启用成员将立即按新权限访问业务数据。`} confirmLabel="保存并生效" onConfirm={() => void save()} onCancel={() => setPendingAction(null)}><p>本次配置包含 <strong>{draft.length}</strong> 项有效权限，所有变化将写入组织审计日志。</p></ConfirmDialog>
      <ConfirmDialog open={pendingAction === "reset"} title="恢复系统默认权限" description={`将删除${roleMeta[selectedRole].label}的组织级权限覆盖，重新使用系统默认模板。`} confirmLabel="恢复默认" tone="warning" onConfirm={() => void reset()} onCancel={() => setPendingAction(null)} />
      <ConfirmDialog open={Boolean(pendingRole)} title="放弃未保存修改" description="切换角色会丢弃当前权限草稿，已保存的数据库配置不会受到影响。" confirmLabel="放弃并切换" tone="warning" onConfirm={() => { if (!pendingRole) return; activateRole(pendingRole); setPendingRole(null); }} onCancel={() => setPendingRole(null)} />
    </AppLayout>
  );
}
