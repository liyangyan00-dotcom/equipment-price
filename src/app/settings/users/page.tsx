"use client";

import Link from "next/link";
import { SettingsAccessState, SettingsRequestError } from "@/components/settings/SettingsAccessState";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  KeyRound,
  Mail,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingButton } from "@/components/common/LoadingButton";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "manager" | "reviewer" | "editor" | "viewer";

type OrganizationUser = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  locale: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  isCurrentUser: boolean;
};

type AuditItem = {
  id: number;
  action: string;
  table_name: string;
  record_id: string;
  created_at: string;
};

type UsersResponse = {
  data: OrganizationUser[];
  organization: { id: string; code: string; name: string } | null;
  currentUserId: string;
  currentRole: UserRole;
  roles: UserRole[];
};

const roleMeta: Record<UserRole, { label: string; description: string; className: string }> = {
  admin: { label: "系统管理员", description: "组织、用户、权限和系统配置", className: "border-ai-border bg-ai-soft text-ai" },
  manager: { label: "业务负责人", description: "业务审批、审核和数据管理", className: "border-primary/20 bg-primary-soft text-primary" },
  reviewer: { label: "审核员", description: "价格、供应商与 AI 结果复核", className: "border-warning/20 bg-warning-soft text-warning" },
  editor: { label: "业务编辑", description: "维护价格、询价、项目和文件", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  viewer: { label: "只读成员", description: "查看业务数据，不可修改", className: "border-slate-200 bg-slate-50 text-slate-600" },
};

const pageSize = 15;

function formatDate(value: string | null, fallback = "尚未登录") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new SettingsRequestError(payload.error || `请求失败（${response.status}）`, response.status);
  return payload;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-pill border px-2 text-[11px] font-semibold", roleMeta[role].className)}>
      {roleMeta[role].label}
    </span>
  );
}

function StatusBadge({ user }: { user: OrganizationUser }) {
  const invited = !user.emailConfirmedAt;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-pill border px-2 text-[11px] font-semibold",
        !user.isActive
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : invited
            ? "border-warning/20 bg-warning-soft text-warning"
            : "border-success/20 bg-success-soft text-success",
      )}
    >
      {!user.isActive ? <Ban className="size-3" /> : invited ? <Clock3 className="size-3" /> : <CheckCircle2 className="size-3" />}
      {!user.isActive ? "已停用" : invited ? "待接受邀请" : "已启用"}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  note: string;
  icon: typeof Users;
  tone: "blue" | "cyan" | "purple" | "green" | "orange" | "red";
}) {
  const tones = {
    blue: "border-blue-100 bg-gradient-to-br from-white to-blue-50 text-primary shadow-[0_10px_24px_rgba(47,107,255,0.08)]",
    cyan: "border-cyan-100 bg-gradient-to-br from-white to-cyan-50 text-cyan-600 shadow-[0_10px_24px_rgba(6,182,212,0.08)]",
    purple: "border-purple-100 bg-gradient-to-br from-white to-purple-50 text-ai shadow-[0_10px_24px_rgba(126,58,242,0.08)]",
    green: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50 text-success shadow-[0_10px_24px_rgba(20,184,122,0.08)]",
    orange: "border-orange-100 bg-gradient-to-br from-white to-orange-50 text-warning shadow-[0_10px_24px_rgba(245,158,11,0.08)]",
    red: "border-red-100 bg-gradient-to-br from-white to-red-50 text-danger shadow-[0_10px_24px_rgba(239,68,68,0.08)]",
  };
  return (
    <section className={cn("relative min-h-[92px] overflow-hidden rounded-card border p-3.5", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold">{title}</p>
          <p className="mt-1 text-[24px] font-bold leading-none">{value}<span className="ml-1 text-[12px] font-semibold">人</span></p>
          <p className="mt-2 text-[11px] text-textMuted">{note}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.09)]">
          <Icon className="size-5" />
        </span>
      </div>
    </section>
  );
}

function InviteDialog({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (input: { email: string; displayName: string; phone: string; role: UserRole }) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");

  return (
    <OverlayShell open={open} onClose={onClose} ariaLabel="邀请组织成员" panelClassName="max-w-[560px]">
      <div className="border-b border-borderSoft bg-gradient-to-r from-primary-soft to-ai-soft px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-primary text-white shadow-[0_10px_22px_rgba(47,107,255,0.25)]">
              <UserCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-textMain">邀请组织成员</h2>
              <p className="mt-1 text-[12px] text-textMuted">Supabase Auth 将发送真实邀请邮件，接受后即可登录。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-white/70" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ email, displayName, phone, role });
        }}
      >
        <label className="block text-[12px] font-semibold text-textSecondary">
          登录邮箱 <span className="text-danger">*</span>
          <input data-overlay-autofocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] font-semibold text-textSecondary">
            姓名
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="成员姓名" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] outline-none focus:border-primary" />
          </label>
          <label className="block text-[12px] font-semibold text-textSecondary">
            电话
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="可选" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] outline-none focus:border-primary" />
          </label>
        </div>
        <label className="block text-[12px] font-semibold text-textSecondary">
          初始角色
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] outline-none focus:border-primary">
            {Object.entries(roleMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label} · {meta.description}</option>)}
          </select>
        </label>
        <div className="rounded-card border border-ai-border bg-ai-soft px-4 py-3 text-[12px] leading-5 text-textSecondary">
          角色仅决定系统权限，不代表业务审批结论。关键价格、供应商和 AI 结果仍须按审核流程人工确认。
        </div>
        <div className="flex justify-end gap-2 border-t border-borderSoft pt-4">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary hover:bg-slate-50">取消</button>
          <LoadingButton loading={loading} icon={<Mail className="size-4" />} type="submit">发送邀请</LoadingButton>
        </div>
      </form>
    </OverlayShell>
  );
}

function UserDetailDrawer({
  user,
  activity,
  loadingActivity,
  saving,
  onClose,
  onSave,
  onResetPassword,
}: {
  user: OrganizationUser;
  activity: AuditItem[];
  loadingActivity: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (displayName: string, phone: string) => void;
  onResetPassword: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone ?? "");

  return (
    <OverlayShell open onClose={onClose} variant="drawer" ariaLabel="成员详情" panelClassName="w-[480px]">
        <div className="h-full overflow-y-auto bg-page">
          <div className="sticky top-0 z-10 border-b border-borderSoft bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-ai text-[16px] font-bold text-white shadow-[0_10px_24px_rgba(47,107,255,0.22)]">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-semibold text-textMain">{user.displayName}</h2>
                  <p className="truncate text-[12px] text-textMuted">{user.email ?? "未登记邮箱"}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100" aria-label="关闭"><X className="size-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><RoleBadge role={user.role} /><StatusBadge user={user} />{user.isCurrentUser ? <span className="inline-flex h-6 items-center rounded-pill bg-primary px-2 text-[11px] font-semibold text-white">当前账号</span> : null}</div>
          </div>
          <div className="space-y-3 p-4">
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2"><PencilLine className="size-4 text-primary" /><h3 className="text-[14px] font-semibold text-textMain">成员资料</h3></div>
              <div className="space-y-3">
                <label className="block text-[11px] font-semibold text-textMuted">姓名<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-primary" /></label>
                <label className="block text-[11px] font-semibold text-textMuted">电话<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="未登记" className="mt-1 h-9 w-full rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-primary" /></label>
                <LoadingButton loading={saving} className="w-full" onClick={() => onSave(displayName, phone)}>保存成员资料</LoadingButton>
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-textMuted">加入时间</p><p className="mt-1 font-semibold text-textMain">{formatDate(user.joinedAt)}</p></div>
                <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-textMuted">最近登录</p><p className="mt-1 font-semibold text-textMain">{formatDate(user.lastSignInAt)}</p></div>
              </div>
              <button type="button" onClick={onResetPassword} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-warning/20 bg-warning-soft text-[12px] font-semibold text-warning"><KeyRound className="size-4" />发送密码重置邮件</button>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2"><Activity className="size-4 text-ai" /><h3 className="text-[14px] font-semibold text-textMain">权限变更记录</h3></div>
              {loadingActivity ? <p className="py-4 text-center text-[12px] text-textMuted">正在读取审计记录...</p> : activity.length ? (
                <div className="space-y-2">{activity.map((item) => <div key={item.id} className="flex items-start gap-2 rounded-[10px] border border-borderSoft bg-slate-50 p-2.5 text-[11px]"><span className="mt-0.5 size-2 shrink-0 rounded-full bg-ai" /><div><p className="font-semibold text-textSecondary">{item.action.toUpperCase()} · 组织成员</p><p className="mt-0.5 text-textMuted">{formatDate(item.created_at)}</p></div></div>)}</div>
              ) : <p className="rounded-[10px] bg-slate-50 px-3 py-5 text-center text-[12px] text-textMuted">暂无角色或状态变更记录</p>}
            </section>
          </div>
        </div>
    </OverlayShell>
  );
}

export default function UsersPage() {
  const toast = useMockToast();
  const [response, setResponse] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<OrganizationUser | null>(null);
  const [activity, setActivity] = useState<AuditItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<null | { type: "status" | "role" | "reset"; user: OrganizationUser; role?: UserRole }>(null);

  const loadUsers = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    setDenied(false);
    try {
      const data = await apiRequest<UsersResponse>("/api/settings/users", { cache: "no-store" });
      setResponse(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setResponse(null);
      setDenied(requestError instanceof SettingsRequestError && requestError.status === 403);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<UsersResponse>("/api/settings/users", { cache: "no-store" })
      .then((data) => {
        if (!cancelled) setResponse(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(errorMessage(requestError));
          setResponse(null);
          setDenied(requestError instanceof SettingsRequestError && requestError.status === 403);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const users = useMemo(() => response?.data ?? [], [response]);
  const filtered = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return users.filter((user) => {
      const keywordMatch = !normalizedKeyword || [user.displayName, user.email, user.phone, user.userId].some((value) => value?.toLowerCase().includes(normalizedKeyword));
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const status = !user.isActive ? "inactive" : !user.emailConfirmedAt ? "invited" : "active";
      const statusMatch = statusFilter === "all" || statusFilter === status;
      return keywordMatch && roleMatch && statusMatch;
    });
  }, [keyword, roleFilter, statusFilter, users]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = {
    total: users.length,
    active: users.filter((user) => user.isActive && user.emailConfirmedAt).length,
    admins: users.filter((user) => user.role === "admin" && user.isActive).length,
    reviewers: users.filter((user) => user.role === "reviewer" && user.isActive).length,
    invited: users.filter((user) => user.isActive && !user.emailConfirmedAt).length,
    inactive: users.filter((user) => !user.isActive).length,
  };

  const updateUser = async (input: Record<string, unknown>, success: string) => {
    setSaving(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/settings/users", { method: "PATCH", body: JSON.stringify(input) });
      toast.success(success, "组织成员数据和审计记录已同步更新。");
      await loadUsers(true);
      if (detailUser?.userId === input.userId) {
        setDetailUser((current) => current ? { ...current, ...(
          typeof input.displayName === "string" ? { displayName: input.displayName } : {}
        ), ...(
          typeof input.phone === "string" ? { phone: input.phone } : {}
        ) } : null);
      }
    } catch (requestError) {
      toast.danger("操作失败", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (user: OrganizationUser) => {
    setDetailUser(user);
    setActivity([]);
    setActivityLoading(true);
    try {
      const result = await apiRequest<{ data: AuditItem[] }>("/api/settings/users", { method: "PUT", body: JSON.stringify({ userId: user.userId }) });
      setActivity(result.data);
    } catch (requestError) {
      toast.warning("审计记录暂不可用", errorMessage(requestError));
    } finally {
      setActivityLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.type === "reset") {
      try {
        await apiRequest<{ ok: boolean }>("/api/settings/users", { method: "POST", body: JSON.stringify({ action: "reset_password", userId: action.user.userId }) });
        toast.success("重置邮件已发送", `已向 ${action.user.email ?? action.user.displayName} 发送密码重置邮件。`);
      } catch (requestError) {
        toast.danger("发送失败", errorMessage(requestError));
      }
      return;
    }
    if (action.type === "role") {
      await updateUser({ userId: action.user.userId, role: action.role }, "成员角色已更新");
      return;
    }
    await updateUser({ userId: action.user.userId, isActive: !action.user.isActive }, action.user.isActive ? "成员已停用" : "成员已启用");
  };

  const resetFilters = () => { setKeyword(""); setRoleFilter("all"); setStatusFilter("all"); };

  if (loading || error || !response) return <AppLayout><SettingsAccessState title="用户管理" loading={loading} denied={denied} error={error} onRetry={() => void loadUsers()} /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="用户管理"
          description={`管理 ${response?.organization?.name ?? "当前组织"} 的成员、角色、账号状态与登录安全。所有权限变更均进入审计日志。`}
          actions={<><Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary hover:border-primary hover:text-primary"><ChevronLeft className="size-4" />返回系统设置</Link><Link href="/settings/roles" className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai"><ShieldCheck className="size-4" />角色权限</Link><button type="button" onClick={() => void loadUsers()} className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-primary" title="刷新成员"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button><button type="button" onClick={() => setInviteOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white shadow-[0_10px_22px_rgba(47,107,255,0.22)]"><Plus className="size-4" />邀请成员</button></>}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard title="组织成员" value={stats.total} note="当前组织全部账号" icon={Users} tone="blue" />
          <SummaryCard title="正常使用" value={stats.active} note="已验证且已启用" icon={UserCheck} tone="green" />
          <SummaryCard title="系统管理员" value={stats.admins} note="拥有用户管理权限" icon={ShieldCheck} tone="purple" />
          <SummaryCard title="审核员" value={stats.reviewers} note="负责人工审核闭环" icon={BadgeCheck} tone="cyan" />
          <SummaryCard title="待接受邀请" value={stats.invited} note="尚未完成账号激活" icon={Clock3} tone="orange" />
          <SummaryCard title="已停用" value={stats.inactive} note="已禁止进入业务系统" icon={UserX} tone="red" />
        </div>

        <section className="rounded-card border border-borderSoft bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-borderSoft p-3 xl:flex-row xl:items-end">
            <label className="min-w-0 flex-1 text-[11px] font-semibold text-textMuted">搜索成员<div className="relative mt-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" /><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); setSelected([]); }} placeholder="姓名、邮箱、电话或用户 ID" className="h-9 w-full rounded-md border border-borderSoft bg-white pl-9 pr-3 text-[12px] outline-none focus:border-primary" /></div></label>
            <label className="text-[11px] font-semibold text-textMuted xl:w-[190px]">角色<select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as UserRole | "all"); setPage(1); setSelected([]); }} className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"><option value="all">全部角色</option>{Object.entries(roleMeta).map(([role, meta]) => <option key={role} value={role}>{meta.label}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-textMuted xl:w-[170px]">账号状态<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); setSelected([]); }} className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"><option value="all">全部状态</option><option value="active">已启用</option><option value="invited">待接受邀请</option><option value="inactive">已停用</option></select></label>
            <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-semibold text-textSecondary hover:text-primary"><RefreshCw className="size-3.5" />重置</button>
          </div>

          <div className="grid min-w-0 gap-3 p-3 2xl:grid-cols-[minmax(0,1fr)_286px]">
            <div className="min-w-0 overflow-hidden rounded-card border border-borderSoft">
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-borderSoft bg-slate-50 px-3 py-2">
                <div className="text-[12px] text-textMuted">共 <strong className="text-textMain">{filtered.length}</strong> 名成员，已选 <strong className="text-primary">{selected.length}</strong> 名</div>
                <div className="flex items-center gap-2"><button type="button" disabled={!selected.length} onClick={() => toast.info("批量操作", `已选择 ${selected.length} 名成员，请逐项确认角色或启停状态。`)} className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary disabled:cursor-not-allowed disabled:opacity-40">批量操作</button></div>
              </div>
              {loading ? <div className="flex min-h-[320px] items-center justify-center text-[13px] text-textMuted"><RefreshCw className="mr-2 size-4 animate-spin" />正在读取 Supabase 组织成员...</div> : error ? <EmptyState className="border-0 shadow-none" title="用户数据读取失败" description={error} primaryAction={<button type="button" onClick={() => void loadUsers()} className="h-9 rounded-md bg-primary px-4 text-[12px] font-semibold text-white">重新加载</button>} /> : pageRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[1040px] w-full table-fixed text-left text-[12px]">
                    <thead className="h-10 bg-[#F8FAFD] text-[11px] font-semibold text-textMuted"><tr><th className="w-10 px-3"><input type="checkbox" aria-label="全选本页" checked={pageRows.length > 0 && pageRows.every((user) => selected.includes(user.userId))} onChange={(event) => setSelected((current) => event.target.checked ? Array.from(new Set([...current, ...pageRows.map((user) => user.userId)])) : current.filter((id) => !pageRows.some((user) => user.userId === id)))} /></th><th className="w-[240px] px-2">成员</th><th className="w-[150px] px-2">角色</th><th className="w-[120px] px-2">状态</th><th className="w-[150px] px-2">加入时间</th><th className="w-[150px] px-2">最近登录</th><th className="w-[210px] px-2 text-center">操作</th></tr></thead>
                    <tbody>{pageRows.map((user) => <tr key={user.userId} className="h-12 border-t border-borderSoft transition hover:bg-primary-soft/30"><td className="px-3"><input type="checkbox" aria-label={`选择${user.displayName}`} checked={selected.includes(user.userId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, user.userId] : current.filter((id) => id !== user.userId))} /></td><td className="px-2"><button type="button" onClick={() => void openDetail(user)} className="flex min-w-0 items-center gap-2 text-left"><span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft font-bold text-primary">{user.displayName.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold text-textMain hover:text-primary">{user.displayName}{user.isCurrentUser ? "（我）" : ""}</span><span className="block truncate text-[11px] text-textMuted">{user.email ?? user.userId}</span></span></button></td><td className="px-2"><select aria-label={`调整${user.displayName}角色`} value={user.role} disabled={user.isCurrentUser || saving} onChange={(event) => setPending({ type: "role", user, role: event.target.value as UserRole })} className={cn("h-8 w-[138px] rounded-md border px-2 text-[11px] font-semibold outline-none", roleMeta[user.role].className, user.isCurrentUser && "cursor-not-allowed opacity-70")}>{Object.entries(roleMeta).map(([role, meta]) => <option key={role} value={role}>{meta.label}</option>)}</select></td><td className="px-2"><StatusBadge user={user} /></td><td className="px-2 text-[11px] text-textSecondary">{formatDate(user.joinedAt)}</td><td className="px-2 text-[11px] text-textSecondary">{formatDate(user.lastSignInAt)}</td><td className="px-2"><div className="flex items-center justify-center gap-1.5"><button type="button" onClick={() => void openDetail(user)} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[11px] font-semibold text-primary"><CircleUserRound className="size-3.5" />详情</button><button type="button" disabled={user.isCurrentUser || saving} onClick={() => setPending({ type: "status", user })} className={cn("inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40", user.isActive ? "border-danger/20 bg-danger-soft text-danger" : "border-success/20 bg-success-soft text-success")}>{user.isActive ? <Ban className="size-3.5" /> : <UserCheck className="size-3.5" />}{user.isActive ? "停用" : "启用"}</button></div></td></tr>)}</tbody>
                  </table>
                </div>
              ) : <EmptyState className="border-0 shadow-none" title="没有匹配的组织成员" description="请调整关键词、角色或账号状态筛选条件。" primaryAction={<button type="button" onClick={resetFilters} className="h-9 rounded-md bg-primary px-4 text-[12px] font-semibold text-white">清除筛选</button>} />}
              <div className="flex min-h-11 items-center justify-between border-t border-borderSoft px-3 text-[11px] text-textMuted"><span>共 {filtered.length} 条，每页 {pageSize} 条，当前第 {safePage} / {pageCount} 页</span><div className="flex items-center gap-1"><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => value - 1)} className="flex size-7 items-center justify-center rounded-md border border-borderSoft disabled:opacity-30"><ChevronLeft className="size-3.5" /></button><span className="flex size-7 items-center justify-center rounded-md bg-primary font-semibold text-white">{safePage}</span><button type="button" disabled={safePage >= pageCount} onClick={() => setPage((value) => value + 1)} className="flex size-7 items-center justify-center rounded-md border border-borderSoft disabled:opacity-30"><ChevronRight className="size-3.5" /></button></div></div>
            </div>

            <aside className="space-y-3">
              <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[11px] bg-ai text-white"><UserCog className="size-4" /></span><div><h3 className="text-[14px] font-semibold text-textMain">角色权限说明</h3><p className="text-[11px] text-textMuted">权限由数据库 RBAC 统一控制</p></div></div><div className="mt-3 space-y-2">{Object.entries(roleMeta).map(([role, meta]) => <div key={role} className="rounded-[10px] border border-white/80 bg-white/80 p-2.5"><div className="flex items-center justify-between gap-2"><RoleBadge role={role as UserRole} /><span className="text-[11px] font-semibold text-textMuted">{users.filter((user) => user.role === role).length} 人</span></div><p className="mt-1.5 text-[11px] leading-5 text-textMuted">{meta.description}</p></div>)}</div></section>
              <section className="rounded-card border border-warning/20 bg-warning-soft p-4"><div className="flex items-center gap-2 text-warning"><ShieldCheck className="size-4" /><h3 className="text-[13px] font-semibold">安全约束</h3></div><ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-textSecondary"><li>• 不能停用或降级当前登录管理员</li><li>• 组织必须保留至少一名启用管理员</li><li>• 邀请、角色和状态变化自动写入审计日志</li><li>• 业务审批仍以人工审核流程为准</li></ul></section>
            </aside>
          </div>
        </section>
      </div>

      {inviteOpen ? <InviteDialog open loading={inviteLoading} onClose={() => setInviteOpen(false)} onSubmit={async (input) => { setInviteLoading(true); try { await apiRequest<{ ok: boolean }>("/api/settings/users", { method: "POST", body: JSON.stringify(input) }); toast.success("邀请已发送", `${input.email} 已加入组织并收到邀请邮件。`); setInviteOpen(false); await loadUsers(true); } catch (requestError) { toast.danger("邀请失败", errorMessage(requestError)); } finally { setInviteLoading(false); } }} /> : null}
      {detailUser ? <UserDetailDrawer key={detailUser.userId} user={detailUser} activity={activity} loadingActivity={activityLoading} saving={saving} onClose={() => setDetailUser(null)} onSave={(displayName, phone) => void updateUser({ userId: detailUser.userId, displayName, phone }, "成员资料已保存")} onResetPassword={() => setPending({ type: "reset", user: detailUser })} /> : null}
      <ConfirmDialog open={Boolean(pending)} title={pending?.type === "role" ? "确认调整成员角色" : pending?.type === "reset" ? "发送密码重置邮件" : pending?.user.isActive ? "确认停用成员" : "确认启用成员"} description={pending?.type === "role" ? `将 ${pending.user.displayName} 调整为“${pending.role ? roleMeta[pending.role].label : ""}”，权限将立即生效。` : pending?.type === "reset" ? `系统将向 ${pending.user.email ?? pending.user.displayName} 发送真实密码重置邮件。` : pending ? `${pending.user.displayName} ${pending.user.isActive ? "将无法继续访问系统" : "将恢复系统访问权限"}。` : ""} confirmLabel="确认执行" tone={pending?.type === "status" && pending.user.isActive ? "danger" : "warning"} onConfirm={() => void confirmAction()} onCancel={() => setPending(null)} />
    </AppLayout>
  );
}
