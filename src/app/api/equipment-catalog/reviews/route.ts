import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const reviewRoles = new Set(["admin", "manager", "reviewer"]);
const assignRoles = new Set(["admin", "manager"]);
const tabs = new Set([
  "pending",
  "need_info",
  "high_risk",
  "duplicate",
  "approved",
  "rejected",
]);
type ReviewerRow = { user_id: string; display_name: string; role: string };

function cleanText(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 200);
}

function identityKey(row: {
  normalized_name?: string | null;
  equipment_name?: string | null;
  brand?: string | null;
  model?: string | null;
}) {
  const values = row.model
    ? [row.brand || "", row.model]
    : [row.normalized_name || row.equipment_name || "", row.brand || ""];
  return values
    .map((value) => value.trim().toLocaleLowerCase())
    .join("|");
}

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const params = new URL(request.url).searchParams;
  const tabValue = cleanText(params.get("tab"), 24);
  const tab = tabs.has(tabValue) ? tabValue : "pending";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const requestedPageSize = Number(params.get("pageSize")) || 10;
  const pageSize = [10, 20, 30].includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const keyword = cleanText(params.get("keyword"), 100).replace(
    /[%_(),]/g,
    " ",
  );
  const category = cleanText(params.get("category"), 100);
  const risk = cleanText(params.get("risk"), 24);
  const assignee = cleanText(params.get("assignee"), 64);
  const taskId = cleanText(params.get("taskId"), 80);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [summaryResult, reviewersResult] = await Promise.all([
    access.supabase
      .from("wpi_equipment_catalog")
      .select(
        "id,catalog_code,equipment_name,normalized_name,equipment_category,brand,model,review_status,risk_level,parameter_completeness,assigned_reviewer_id,review_due_at,duplicate_of_catalog_id",
      )
      .eq("organization_id", access.organizationId)
      .limit(5000),
    access.supabase.rpc("wpi_list_price_reviewers"),
  ]);

  if (summaryResult.error || reviewersResult.error) {
    return NextResponse.json(
      { error: summaryResult.error?.message || reviewersResult.error?.message },
      { status: 500 },
    );
  }

  const summaryRows = summaryResult.data ?? [];
  const identityGroups = new Map<string, string[]>();
  for (const row of summaryRows) {
    const key = identityKey(row);
    if (!key.replaceAll("|", "")) continue;
    identityGroups.set(key, [...(identityGroups.get(key) ?? []), row.id]);
  }
  const duplicateIds = new Set(
    Array.from(identityGroups.values())
      .filter((ids) => ids.length > 1)
      .flat(),
  );
  for (const row of summaryRows) {
    if (row.duplicate_of_catalog_id) duplicateIds.add(row.id);
  }

  const isPending = (status: string) =>
    status === "draft" || status === "pending_review";
  const summary = {
    pending: summaryRows.filter((row) => isPending(row.review_status)).length,
    need_info: summaryRows.filter(
      (row) =>
        isPending(row.review_status) &&
        Number(row.parameter_completeness || 0) < 85,
    ).length,
    high_risk: summaryRows.filter(
      (row) =>
        isPending(row.review_status) &&
        ["high", "critical"].includes(row.risk_level),
    ).length,
    duplicate: summaryRows.filter(
      (row) => isPending(row.review_status) && duplicateIds.has(row.id),
    ).length,
    approved: summaryRows.filter((row) => row.review_status === "approved")
      .length,
    rejected: summaryRows.filter((row) => row.review_status === "rejected")
      .length,
    overdue: summaryRows.filter(
      (row) =>
        isPending(row.review_status) &&
        row.review_due_at &&
        new Date(row.review_due_at).getTime() < Date.now(),
    ).length,
  };

  let query = access.supabase
    .from("wpi_equipment_catalog")
    .select("*", { count: "exact" })
    .eq("organization_id", access.organizationId);

  if (tab === "pending") query = query.in("review_status", ["draft", "pending_review"]);
  if (tab === "need_info") {
    query = query
      .in("review_status", ["draft", "pending_review"])
      .lt("parameter_completeness", 85);
  }
  if (tab === "high_risk") {
    query = query
      .in("review_status", ["draft", "pending_review"])
      .in("risk_level", ["high", "critical"]);
  }
  if (tab === "duplicate") {
    const ids = Array.from(duplicateIds);
    if (!ids.length) {
      return NextResponse.json({
        data: [],
        count: 0,
        page: 1,
        pageSize,
        summary,
        reviewers: reviewersResult.data ?? [],
        permissions: {
          canReview: reviewRoles.has(access.role),
          canAssign: assignRoles.has(access.role),
          canMerge: assignRoles.has(access.role),
        },
      });
    }
    query = query
      .in("review_status", ["draft", "pending_review"])
      .in("id", ids);
  }
  if (tab === "approved") query = query.eq("review_status", "approved");
  if (tab === "rejected") query = query.eq("review_status", "rejected");

  if (keyword) {
    query = query.or(
      `catalog_code.ilike.%${keyword}%,equipment_name.ilike.%${keyword}%,brand.ilike.%${keyword}%,model.ilike.%${keyword}%`,
    );
  }
  if (category && category !== "all") {
    query = query.eq("equipment_category", category);
  }
  if (risk && risk !== "all") query = query.eq("risk_level", risk);
  if (assignee === "unassigned") query = query.is("assigned_reviewer_id", null);
  if (assignee && assignee !== "all" && assignee !== "unassigned") {
    query = query.eq("assigned_reviewer_id", assignee);
  }
  if (taskId) query = query.eq("collection_task_id", taskId);

  const listResult = await query
    .order("review_due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (listResult.error) {
    return NextResponse.json(
      { error: listResult.error.message },
      { status: 500 },
    );
  }

  const rows = listResult.data ?? [];
  const ids = rows.map((row) => row.id);
  const differenceResult = ids.length
    ? await access.supabase
        .from("wpi_equipment_catalog_parameter_candidates")
        .select("equipment_catalog_id")
        .in("equipment_catalog_id", ids)
        .eq("review_decision", "pending")
    : { data: [], error: null };
  if (differenceResult.error) {
    return NextResponse.json(
      { error: differenceResult.error.message },
      { status: 500 },
    );
  }

  const differenceCounts = (differenceResult.data ?? []).reduce<
    Record<string, number>
  >((result, item) => {
    result[item.equipment_catalog_id] =
      (result[item.equipment_catalog_id] ?? 0) + 1;
    return result;
  }, {});
  const reviewerMap = new Map(
    ((reviewersResult.data ?? []) as ReviewerRow[]).map((reviewer) => [
      reviewer.user_id,
      reviewer.display_name,
    ]),
  );
  const summaryById = new Map(summaryRows.map((row) => [row.id, row]));

  return NextResponse.json({
    data: rows.map((row) => {
      const group = identityGroups.get(identityKey(row)) ?? [];
      return {
        ...row,
        reviewer_name: row.assigned_reviewer_id
          ? reviewerMap.get(row.assigned_reviewer_id) || "已分派成员"
          : "未分派",
        difference_count: differenceCounts[row.id] ?? 0,
        duplicate_candidate_ids: group.filter((id) => id !== row.id),
        duplicate_candidates: group
          .filter((id) => id !== row.id)
          .map((id) => summaryById.get(id))
          .filter(Boolean)
          .map((candidate) => ({
            id: candidate!.id,
            catalog_code: candidate!.catalog_code,
            equipment_name: candidate!.equipment_name,
            brand: candidate!.brand,
            model: candidate!.model,
          })),
      };
    }),
    count: listResult.count ?? 0,
    page,
    pageSize,
    summary,
    reviewers: reviewersResult.data ?? [],
    categories: Array.from(
      new Set(summaryRows.map((row) => row.equipment_category).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    permissions: {
      canReview: reviewRoles.has(access.role),
      canAssign: assignRoles.has(access.role),
      canMerge: assignRoles.has(access.role),
    },
  });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const action = cleanText(body.action, 32);
  const ids = cleanIds(body.ids);

  if (action === "assign") {
    if (!assignRoles.has(access.role)) {
      return NextResponse.json({ error: "当前角色没有分派权限" }, { status: 403 });
    }
    const reviewerId = cleanText(body.reviewerId, 64);
    const dueAt = cleanText(body.dueAt, 64);
    if (!ids.length || !reviewerId || !dueAt) {
      return NextResponse.json(
        { error: "请选择资料、审核责任人和审核时限" },
        { status: 400 },
      );
    }
    const reviewers = await access.supabase.rpc("wpi_list_price_reviewers");
    if (reviewers.error) {
      return NextResponse.json({ error: reviewers.error.message }, { status: 500 });
    }
    if (!((reviewers.data ?? []) as ReviewerRow[]).some((item) => item.user_id === reviewerId)) {
      return NextResponse.json({ error: "审核责任人无效" }, { status: 400 });
    }
    const result = await access.supabase
      .from("wpi_equipment_catalog")
      .update({
        assigned_reviewer_id: reviewerId,
        assigned_by: access.userId,
        assigned_at: new Date().toISOString(),
        review_due_at: new Date(dueAt).toISOString(),
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .in("id", ids)
      .select("id");
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ data: { updated: result.data?.length ?? 0 } });
  }

  if (action === "reject") {
    if (!reviewRoles.has(access.role)) {
      return NextResponse.json({ error: "当前角色没有审核权限" }, { status: 403 });
    }
    const notes = cleanText(body.notes, 2000);
    if (!ids.length || !notes) {
      return NextResponse.json(
        { error: "请选择资料并填写退回原因" },
        { status: 400 },
      );
    }
    const results = await Promise.all(
      ids.map((id) =>
        access.supabase.rpc("wpi_review_equipment_catalog", {
          p_catalog_id: id,
          p_decision: "rejected",
          p_notes: notes,
        }),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }
    return NextResponse.json({ data: { updated: ids.length } });
  }

  if (action === "merge") {
    if (!assignRoles.has(access.role)) {
      return NextResponse.json({ error: "当前角色没有重复合并权限" }, { status: 403 });
    }
    const targetId = cleanText(body.targetId, 64);
    const sourceIds = ids.filter((id) => id !== targetId);
    if (!targetId || !sourceIds.length) {
      return NextResponse.json(
        { error: "请选择一条主记录和至少一条重复记录" },
        { status: 400 },
      );
    }
    const result = await access.supabase.rpc(
      "wpi_merge_equipment_catalog_duplicates",
      {
        p_target_id: targetId,
        p_source_ids: sourceIds,
        p_notes: cleanText(body.notes, 1000),
      },
    );
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  }

  return NextResponse.json({ error: "不支持的审核动作" }, { status: 400 });
}
