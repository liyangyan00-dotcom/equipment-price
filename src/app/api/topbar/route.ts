import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { loadNavigationCounts } from "@/lib/data/navigationCounts";
import { invalidateScopedRead, scopedReadResponse } from "@/lib/data/scopedResponseCache";
import type { TopbarAiMode, TopbarNotificationCategory } from "@/types/topbar";

type NotificationSeed = {
  key: string;
  category: TopbarNotificationCategory;
  title: string;
  message: string;
  href: string;
  count: number;
};

export const dynamic = "force-dynamic";

async function syncDerivedNotifications(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
) {
  const now = new Date().toISOString();
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    pendingReviews,
    highRiskReviews,
    pendingInquiries,
    overduePriceLeads,
    failedCollectionTasks,
    noPriceCollectionTasks,
    missingFxLeads,
    failedSourceRuns,
  ] = await Promise.all([
    access.supabase
      .from("wpi_equipment_price_reviews")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("status", ["pending", "in_review", "need_info"]),
    access.supabase
      .from("wpi_equipment_price_reviews")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("status", ["pending", "in_review", "need_info"])
      .in("risk_level", ["high", "critical"]),
    access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "pending_review"),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "pending_review")
      .lt("review_due_at", now),
    access.supabase
      .from("wpi_price_collection_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "failed"),
    access.supabase
      .from("wpi_price_collection_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("outcome_status", ["no_price", "blocked"]),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("status", ["pending_review", "ready"])
      .in("fx_status", ["missing_rate", "pending"]),
    access.supabase
      .from("wpi_price_collection_source_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .gte("created_at", lastDay)
      .or("status.eq.failed,failed_count.gt.0"),
  ]);

  const seeds: NotificationSeed[] = [
    {
      key: "derived:equipment-review-queue",
      category: "review",
      title: "设备价格待人工复核",
      message: `当前有 ${pendingReviews.count ?? 0} 条价格等待复核或资料补全。`,
      href: "/equipment-prices/reviews",
      count: pendingReviews.count ?? 0,
    },
    {
      key: "derived:high-risk-review",
      category: "risk",
      title: "高风险价格需要处理",
      message: `审核队列中有 ${highRiskReviews.count ?? 0} 条高风险价格，AI 不会自动放行。`,
      href: "/equipment-prices/reviews?risk=high",
      count: highRiskReviews.count ?? 0,
    },
    {
      key: "derived:inquiry-review",
      category: "inquiry",
      title: "询价任务待确认",
      message: `当前有 ${pendingInquiries.count ?? 0} 个询价任务等待确认。`,
      href: "/inquiries?status=pending_review",
      count: pendingInquiries.count ?? 0,
    },
    {
      key: "derived:price-lead-overdue",
      category: "review",
      title: "价格线索审核已逾期",
      message: `当前有 ${overduePriceLeads.count ?? 0} 条价格线索超过审核时限，请按负责人处理。`,
      href: "/price-leads?status=pending&due=overdue",
      count: overduePriceLeads.count ?? 0,
    },
    {
      key: "derived:collection-task-failed",
      category: "risk",
      title: "价格采集任务执行失败",
      message: `当前有 ${failedCollectionTasks.count ?? 0} 个采集任务失败，可进入任务明细重试失败来源。`,
      href: "/ai-price-collection?status=failed",
      count: failedCollectionTasks.count ?? 0,
    },
    {
      key: "derived:collection-no-price",
      category: "system",
      title: "采集未形成合格价格",
      message: `当前有 ${noPriceCollectionTasks.count ?? 0} 个任务无合格价格或采集受阻，请检查来源与准入条件。`,
      href: "/ai-price-collection?outcome=no_price",
      count: noPriceCollectionTasks.count ?? 0,
    },
    {
      key: "derived:collection-missing-fx",
      category: "risk",
      title: "价格线索缺少汇率",
      message: `当前有 ${missingFxLeads.count ?? 0} 条外币线索尚未完成汇率核验，不能进入正式价格库。`,
      href: "/price-leads?issue=missing_rate",
      count: missingFxLeads.count ?? 0,
    },
    {
      key: "derived:collection-source-failed",
      category: "risk",
      title: "采集来源最近运行异常",
      message: `过去 24 小时有 ${failedSourceRuns.count ?? 0} 个来源运行失败或产生错误。`,
      href: "/ai-price-collection?queue=failed_source",
      count: failedSourceRuns.count ?? 0,
    },
  ];

  const { data: existing } = await access.supabase
    .from("wpi_notifications")
    .select("id, dedupe_key, metadata")
    .eq("organization_id", access.organizationId)
    .eq("recipient_id", access.userId)
    .in("dedupe_key", seeds.map((item) => item.key));

  const byKey = new Map((existing ?? []).map((item) => [item.dedupe_key as string, item]));
  for (const seed of seeds) {
    const current = byKey.get(seed.key);
    if (seed.count === 0) {
      if (current) {
        await access.supabase.from("wpi_notifications").delete().eq("id", current.id);
      }
      continue;
    }

    const previousCount = Number((current?.metadata as { count?: number } | null)?.count ?? -1);
    if (current && previousCount === seed.count) continue;

    await access.supabase.from("wpi_notifications").upsert(
      {
        organization_id: access.organizationId,
        recipient_id: access.userId,
        dedupe_key: seed.key,
        category: seed.category,
        title: seed.title,
        message: seed.message,
        href: seed.href,
        is_read: false,
        read_at: null,
        metadata: { count: seed.count, source: "derived" },
      },
      { onConflict: "organization_id,recipient_id,dedupe_key" },
    );
  }
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (request.nextUrl.searchParams.get("refresh") === "1") invalidateScopedRead(access, "topbar");
  return scopedReadResponse(access, "topbar", () => loadTopbar(access));
}

async function loadTopbar(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {

  await syncDerivedNotifications(access);

  const [authUser, profileResult, organizationResult, preferenceResult, notificationResult, navigationResponse] =
    await Promise.all([
      access.supabase.auth.getUser(),
      access.supabase
        .from("wpi_profiles")
        .select("display_name, avatar_url")
        .eq("id", access.userId)
        .maybeSingle(),
      access.supabase
        .from("wpi_organizations")
        .select("name")
        .eq("id", access.organizationId)
        .single(),
      access.supabase
        .from("wpi_user_preferences")
        .select("ai_mode, notifications_enabled")
        .eq("organization_id", access.organizationId)
        .eq("user_id", access.userId)
        .maybeSingle(),
      access.supabase
        .from("wpi_notifications")
        .select("id, category, title, message, href, is_read, created_at")
        .eq("organization_id", access.organizationId)
        .eq("recipient_id", access.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      loadNavigationCounts(access, false),
    ]);

  const queryError =
    authUser.error ||
    profileResult.error ||
    organizationResult.error ||
    preferenceResult.error ||
    notificationResult.error;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }
  if (!navigationResponse.ok) return navigationResponse;
  const navigation = await navigationResponse.json();

  let preference = preferenceResult.data;
  if (!preference) {
    const { data, error } = await access.supabase
      .from("wpi_user_preferences")
      .upsert({
        organization_id: access.organizationId,
        user_id: access.userId,
        ai_mode: "human_review",
        notifications_enabled: true,
      })
      .select("ai_mode, notifications_enabled")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    preference = data;
  }

  const email = authUser.data.user?.email ?? "";
  const displayName = profileResult.data?.display_name?.trim() || email || "当前用户";
  const notifications = (notificationResult.data ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    message: item.message,
    href: item.href,
    isRead: item.is_read,
    createdAt: item.created_at,
  }));

  return NextResponse.json({
    user: {
      id: access.userId,
      displayName,
      email,
      avatarUrl: profileResult.data?.avatar_url ?? null,
      role: access.role,
    },
    organization: {
      id: access.organizationId,
      name: organizationResult.data.name,
    },
    preferences: {
      aiMode: preference.ai_mode,
      notificationsEnabled: preference.notifications_enabled,
    },
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    navigationCounts: navigation.counts,
  });
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as {
    action?: string;
    aiMode?: TopbarAiMode;
    notificationId?: string;
  };

  if (input.action === "set_ai_mode") {
    if (input.aiMode !== "human_review" && input.aiMode !== "assisted") {
      return NextResponse.json({ error: "无效的 AI 协作模式" }, { status: 400 });
    }
    const { error } = await access.supabase.from("wpi_user_preferences").upsert({
      organization_id: access.organizationId,
      user_id: access.userId,
      ai_mode: input.aiMode,
      notifications_enabled: true,
    });
    if (!error) invalidateScopedRead(access, "topbar");
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ aiMode: input.aiMode });
  }

  if (input.action === "read_notification") {
    if (!input.notificationId) {
      return NextResponse.json({ error: "缺少通知 ID" }, { status: 400 });
    }
    const { error } = await access.supabase
      .from("wpi_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", input.notificationId)
      .eq("recipient_id", access.userId);
    if (!error) invalidateScopedRead(access, "topbar");
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true });
  }

  if (input.action === "read_all_notifications") {
    const { error } = await access.supabase
      .from("wpi_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("organization_id", access.organizationId)
      .eq("recipient_id", access.userId)
      .eq("is_read", false);
    if (!error) invalidateScopedRead(access, "topbar");
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "不支持的 Topbar 操作" }, { status: 400 });
}
