"use client";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Blocks,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  FileText,
  LoaderCircle,
  LogOut,
  Package,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  GlobalSearchResult,
  TopbarAiMode,
  TopbarContext,
  TopbarNotification,
} from "@/types/topbar";

type OpenMenu = "search" | "notifications" | "ai" | "user" | null;

const roleLabels: Record<string, string> = {
  admin: "系统管理员",
  manager: "业务负责人",
  reviewer: "审核员",
  editor: "业务编辑",
  viewer: "只读成员",
};

const searchTypeLabels: Record<GlobalSearchResult["type"], string> = {
  equipment: "设备",
  material: "地材",
  supplier: "供应商",
  inquiry: "询价",
  project: "项目",
  report: "报告",
  ai_task: "AI任务",
};

const searchTypeIcons = {
  equipment: Package,
  material: Blocks,
  supplier: Building2,
  inquiry: Send,
  project: Calculator,
  report: FileText,
  ai_task: Bot,
};

function initials(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.slice(0, 2).toUpperCase() : "AI";
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} 天前` : new Date(value).toLocaleDateString("zh-CN");
}

function NotificationIcon({ item }: { item: TopbarNotification }) {
  const isRisk = item.category === "risk";
  const Icon = item.category === "ai" ? Bot : isRisk ? CircleAlert : item.category === "review" ? ShieldCheck : Bell;
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        isRisk
          ? "bg-danger-soft text-danger"
          : item.category === "ai"
            ? "bg-ai-soft text-ai"
            : "bg-primary-soft text-primary",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

export function AppTopbar() {
  const router = useRouter();
  const toast = useMockToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [context, setContext] = useState<TopbarContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [aiModeSaving, setAiModeSaving] = useState(false);
  const forceContextRefresh = useRef(false);

  const loadContext = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setContextLoading(true);
    try {
      const refresh = forceContextRefresh.current;
      forceContextRefresh.current = false;
      const response = await fetch(refresh ? "/api/topbar?refresh=1" : "/api/topbar", { cache: "no-store", signal });
      const payload = (await response.json()) as TopbarContext & { error?: string };
      if (!response.ok) throw Object.assign(new Error(payload.error || "Topbar 数据加载失败"), { status: response.status });
      if (signal?.aborted) return;
      setContext(payload);
      window.dispatchEvent(new CustomEvent("wpi:navigation-context", { detail: { counts: payload.navigationCounts, aiMode: payload.preferences.aiMode } }));
      setContextError("");
    } catch (error) {
      if (signal?.aborted) throw error;
      setContextError(error instanceof Error ? error.message : "Topbar 数据加载失败");
      if (signal) throw error;
    } finally {
      if (!signal?.aborted) setContextLoading(false);
    }
  }, []);

  const contextPoller = useVisiblePolling(async (signal) => { await loadContext(true, signal); return true; }, 60_000);
  useEffect(() => {
    const refresh = () => { forceContextRefresh.current = true; contextPoller.current?.refresh(); };
    window.addEventListener("wpi:sidebar-counts-refresh", refresh);
    return () => {
      window.removeEventListener("wpi:sidebar-counts-refresh", refresh);
    };
  }, [contextPoller]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/topbar/search?q=${encodeURIComponent(keyword)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: GlobalSearchResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "搜索失败");
        setSearchResults(payload.results ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchError(error instanceof Error ? error.message : "搜索失败");
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpenMenu(null);
      router.push(href);
    },
    [router],
  );

  const submitSearch = () => {
    const keyword = query.trim();
    if (!keyword) {
      toast.info("请输入搜索内容", "可搜索设备、地材、供应商、询价、项目、报告或 AI 采集任务。");
      return;
    }
    if (searchResults[0]) navigate(searchResults[0].href);
    else setOpenMenu("search");
  };

  const updateAiMode = async (aiMode: TopbarAiMode) => {
    if (!context || aiModeSaving || context.preferences.aiMode === aiMode) return;
    setAiModeSaving(true);
    try {
      const response = await fetch("/api/topbar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_ai_mode", aiMode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "AI 模式保存失败");
      setContext((current) =>
        current ? { ...current, preferences: { ...current.preferences, aiMode } } : current,
      );
      setOpenMenu(null);
      toast.success(
        aiMode === "human_review" ? "已启用 AI 人工复核模式" : "已启用 AI 辅助模式",
        "设置已保存到当前组织账户；高风险与低置信度结果仍需人工确认。",
      );
    } catch (error) {
      toast.danger("AI 模式保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setAiModeSaving(false);
    }
  };

  const markNotificationRead = async (item: TopbarNotification) => {
    if (!item.isRead) {
      const response = await fetch("/api/topbar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_notification", notificationId: item.id }),
      });
      if (response.ok) {
        setContext((current) =>
          current
            ? {
                ...current,
                notifications: current.notifications.map((notification) =>
                  notification.id === item.id ? { ...notification, isRead: true } : notification,
                ),
                unreadCount: Math.max(0, current.unreadCount - 1),
              }
            : current,
        );
      }
    }
    if (item.href) navigate(item.href);
  };

  const markAllRead = async () => {
    const response = await fetch("/api/topbar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all_notifications" }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.danger("通知更新失败", payload.error || "请稍后重试");
      return;
    }
    setContext((current) =>
      current
        ? {
            ...current,
            notifications: current.notifications.map((item) => ({ ...item, isRead: true })),
            unreadCount: 0,
          }
        : current,
    );
    toast.success("通知已全部标为已读");
  };

  const displayName = context?.user.displayName ?? "加载中";
  const roleLabel = context ? roleLabels[context.user.role] ?? context.user.role : "";
  const aiMode = context?.preferences.aiMode ?? "human_review";
  const searchStatus = useMemo(() => {
    if (searchLoading) return "正在检索当前组织数据...";
    if (searchError) return searchError;
    if (query.trim().length < 2) return "输入至少 2 个字符开始搜索";
    if (searchResults.length === 0) return "没有找到匹配记录";
    return "";
  }, [query, searchError, searchLoading, searchResults.length]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borderSoft bg-white/90 px-5 shadow-topbar backdrop-blur-xl">
      <div ref={rootRef} className="flex w-full items-center justify-between gap-3">
        <div className="relative w-full max-w-[430px]">
          <div className="flex h-8 items-center gap-2 rounded-[10px] border border-borderSoft bg-[var(--color-bg-muted)] px-2.5 text-textMuted transition focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
            <button type="button" onClick={submitSearch} className="flex size-5 shrink-0 items-center justify-center rounded-md hover:text-primary" aria-label="全局搜索">
              {searchLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
            </button>
            <input
              value={query}
              onFocus={() => setOpenMenu("search")}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setSearchResults([]);
                  setSearchLoading(false);
                  setSearchError("");
                }
                setOpenMenu("search");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="搜索设备、地材、供应商、询价或 AI 任务"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-textMain outline-none placeholder:text-textMuted"
              aria-label="全局业务搜索"
            />
            {query.trim() ? (
              <button type="button" onClick={() => { setQuery(""); setSearchResults([]); setSearchLoading(false); setSearchError(""); }} className="flex size-5 shrink-0 items-center justify-center rounded-md hover:text-primary" aria-label="清空搜索">
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {openMenu === "search" ? (
            <div className="absolute left-0 top-10 z-50 max-h-[430px] w-full min-w-[360px] overflow-y-auto rounded-[10px] border border-borderSoft bg-white p-1.5 shadow-float">
              {searchResults.map((item) => {
                const Icon = searchTypeIcons[item.type];
                return (
                  <button key={`${item.type}-${item.id}`} type="button" onClick={() => navigate(item.href)} className="flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-primary-soft">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-textMain">{item.title}</span>
                      <span className="block truncate text-[11px] text-textMuted">{item.subtitle}</span>
                    </span>
                    <span className="shrink-0 rounded-pill bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] text-textMuted">{searchTypeLabels[item.type]}</span>
                  </button>
                );
              })}
              {searchResults.length === 0 ? (
                <div className={cn("flex min-h-20 items-center justify-center px-4 text-center text-[12px]", searchError ? "text-danger" : "text-textMuted")}>{searchStatus}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative hidden md:block">
            <button type="button" data-no-global-interaction aria-expanded={openMenu === "ai"} onClick={() => setOpenMenu((current) => current === "ai" ? null : "ai")} className="flex h-8 items-center gap-2 rounded-pill border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai transition hover:border-ai">
              {aiModeSaving ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {aiMode === "human_review" ? "AI 人工复核模式" : "AI 辅助模式"}
              <ChevronDown className={cn("size-3.5 transition", openMenu === "ai" && "rotate-180")} />
            </button>
            {openMenu === "ai" ? (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-[10px] border border-borderSoft bg-white p-2 shadow-float">
                <p className="px-2 pb-1 text-[11px] font-semibold text-textMain">AI 协作模式</p>
                <button type="button" onClick={() => void updateAiMode("human_review")} className={cn("mt-1 w-full rounded-lg border p-2.5 text-left", aiMode === "human_review" ? "border-ai-border bg-ai-soft" : "border-borderSoft hover:bg-[var(--color-bg-muted)]")}>
                  <span className="flex items-center justify-between text-[12px] font-semibold text-textMain">AI 人工复核模式{aiMode === "human_review" ? <CheckCheck className="size-4 text-ai" /> : null}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-textMuted">所有 AI 结果进入人工确认，适用于正式业务。</span>
                </button>
                <button type="button" onClick={() => void updateAiMode("assisted")} className={cn("mt-1.5 w-full rounded-lg border p-2.5 text-left", aiMode === "assisted" ? "border-ai-border bg-ai-soft" : "border-borderSoft hover:bg-[var(--color-bg-muted)]")}>
                  <span className="flex items-center justify-between text-[12px] font-semibold text-textMain">AI 辅助模式{aiMode === "assisted" ? <CheckCheck className="size-4 text-ai" /> : null}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-textMuted">加速低风险分析；高风险和低置信度结果仍强制复核。</span>
                </button>
                <p className="mt-2 rounded-md bg-warning-soft px-2 py-1.5 text-[10px] leading-4 text-warning">AI 不替代最终商务判断。</p>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button type="button" data-no-global-interaction onClick={() => setOpenMenu((current) => current === "notifications" ? null : "notifications")} className="relative flex size-8 items-center justify-center rounded-pill border border-borderSoft bg-white text-textMuted transition hover:border-primary hover:text-primary" aria-label={`通知${context?.unreadCount ? `，${context.unreadCount} 条未读` : ""}`} aria-expanded={openMenu === "notifications"}>
              <Bell className="size-4" />
              {context?.unreadCount ? <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[9px] font-bold leading-4 text-white">{context.unreadCount > 9 ? "9+" : context.unreadCount}</span> : null}
            </button>
            {openMenu === "notifications" ? (
              <div className="absolute right-0 top-10 z-50 w-[360px] overflow-hidden rounded-[10px] border border-borderSoft bg-white shadow-float">
                <div className="flex h-10 items-center justify-between border-b border-borderSoft px-3">
                  <div><span className="text-[12px] font-semibold text-textMain">业务通知</span><span className="ml-2 text-[10px] text-textMuted">{context?.unreadCount ?? 0} 条未读</span></div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => void loadContext()} className="flex size-7 items-center justify-center rounded-md text-textMuted hover:bg-primary-soft hover:text-primary" aria-label="刷新通知"><RefreshCw className={cn("size-3.5", contextLoading && "animate-spin")} /></button>
                    <button type="button" onClick={() => void markAllRead()} disabled={!context?.unreadCount} className="rounded-md px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:text-textMuted/45">全部已读</button>
                  </div>
                </div>
                <div className="max-h-[380px] overflow-y-auto p-1.5">
                  {contextError ? (
                    <button type="button" onClick={() => void loadContext()} className="flex min-h-20 w-full items-center justify-center rounded-lg px-4 text-[11px] text-danger hover:bg-danger-soft">{contextError}，点击重试</button>
                  ) : contextLoading && !context ? (
                    <div className="flex min-h-20 items-center justify-center gap-2 text-[11px] text-textMuted"><LoaderCircle className="size-4 animate-spin" />加载通知</div>
                  ) : context?.notifications.length ? (
                    context.notifications.map((item) => (
                      <button key={item.id} type="button" onClick={() => void markNotificationRead(item)} className={cn("flex min-h-16 w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-primary-soft", !item.isRead && "bg-[var(--color-bg-muted)]")}>
                        <NotificationIcon item={item} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2"><span className="line-clamp-1 flex-1 text-[11px] font-semibold text-textMain">{item.title}</span>{!item.isRead ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" /> : null}</span>
                          <span className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-textMuted">{item.message}</span>
                          <span className="mt-1 block text-[9px] text-textMuted/70">{relativeTime(item.createdAt)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="flex min-h-24 flex-col items-center justify-center text-center text-[11px] text-textMuted"><CheckCheck className="mb-2 size-5 text-success" />当前没有待处理通知</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button type="button" data-no-global-interaction aria-expanded={openMenu === "user"} onClick={() => setOpenMenu((current) => current === "user" ? null : "user")} className="flex h-8 items-center gap-2.5 rounded-pill border border-borderSoft bg-white px-2.5 pl-3 text-left transition hover:border-primary" aria-label="用户菜单">
              <span className="hidden max-w-28 truncate text-[13px] font-medium text-textMain lg:inline">{context?.organization.name ?? "当前组织"}</span>
              <span className="flex size-6 items-center justify-center rounded-pill bg-primary text-[10px] font-semibold text-white">{initials(displayName)}</span>
              <ChevronDown className={cn("size-3.5 text-textMuted transition", openMenu === "user" && "rotate-180")} />
            </button>
            {openMenu === "user" ? (
              <div className="absolute right-0 top-10 z-50 w-64 rounded-[10px] border border-borderSoft bg-white p-1.5 shadow-float">
                <div className="mb-1 rounded-lg bg-[var(--color-bg-muted)] p-2.5">
                  <p className="truncate text-[12px] font-semibold text-textMain">{displayName}</p>
                  <p className="mt-0.5 truncate text-[10px] text-textMuted">{context?.user.email || "正在读取账户"}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px]"><span className="rounded-pill bg-primary-soft px-2 py-0.5 font-medium text-primary">{roleLabel || "成员"}</span><span className="min-w-0 truncate text-textMuted">{context?.organization.name}</span></div>
                </div>
                <button type="button" onClick={() => navigate("/settings")} className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-medium text-textSecondary hover:bg-primary-soft hover:text-primary"><Settings className="size-3.5" />系统设置</button>
                {context?.user.role === "admin" ? <button type="button" onClick={() => navigate("/settings/users")} className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-medium text-textSecondary hover:bg-primary-soft hover:text-primary"><UsersRound className="size-3.5" />成员与权限</button> : null}
                {context?.user.role === "admin" || context?.user.role === "manager" ? <button type="button" onClick={() => navigate("/settings/logs")} className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-medium text-textSecondary hover:bg-primary-soft hover:text-primary"><BriefcaseBusiness className="size-3.5" />审计日志</button> : null}
                <div className="my-1 border-t border-borderSoft" />
                <form action="/auth/signout" method="post"><button type="submit" data-no-global-interaction className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-medium text-danger hover:bg-danger-soft"><LogOut className="size-3.5" />安全退出</button></form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
