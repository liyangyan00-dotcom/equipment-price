import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentReviewDecision,
  EquipmentReviewEvidenceState,
} from "@/types/equipmentReview";

const allowedDecisions = new Set<EquipmentReviewDecision>([
  "start",
  "approve",
  "reject",
  "need_info",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!["admin", "manager", "reviewer"].includes(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格审核权限" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    decision?: EquipmentReviewDecision;
    comment?: string;
    evidenceStates?: Record<string, EquipmentReviewEvidenceState>;
    resolvedIssueIds?: string[];
  };

  const comment = body.comment?.trim() ?? "";

  if (body.decision && !allowedDecisions.has(body.decision)) {
    return NextResponse.json({ error: "无效的审核动作" }, { status: 400 });
  }

  if (body.decision || body.evidenceStates) {
    const { data: reviewState, error: reviewStateError } =
      await access.supabase
        .from("wpi_equipment_price_reviews")
        .select("status, assigned_to")
        .eq("id", id)
        .eq("organization_id", access.organizationId)
        .single();
    if (reviewStateError || !reviewState) {
      return NextResponse.json(
        { error: reviewStateError?.message || "审核任务不存在" },
        { status: 404 }
      );
    }
    if (["approved", "rejected", "archived"].includes(reviewState.status)) {
      return NextResponse.json(
        { error: "该审核任务已结束，不能重复执行审核结论" },
        { status: 409 }
      );
    }
    if (
      reviewState.assigned_to &&
      reviewState.assigned_to !== access.userId
    ) {
      return NextResponse.json(
        { error: "该任务已由其他审核员认领" },
        { status: 409 }
      );
    }
    if (body.decision === "start" && reviewState.status === "in_review") {
      return NextResponse.json(
        { error: "该任务已经处于审核中" },
        { status: 409 }
      );
    }
    if (
      body.decision &&
      ["approve", "reject", "need_info"].includes(body.decision) &&
      (reviewState.status !== "in_review" ||
        reviewState.assigned_to !== access.userId)
    ) {
      return NextResponse.json(
        { error: "请先认领该任务，再提交人工审核结论" },
        { status: 409 }
      );
    }
    if (
      body.evidenceStates &&
      (reviewState.status !== "in_review" ||
        reviewState.assigned_to !== access.userId)
    ) {
      return NextResponse.json(
        { error: "请先认领该任务，再保存审核进度" },
        { status: 409 }
      );
    }
  }

  if (
    body.decision &&
    ["approve", "reject", "need_info"].includes(body.decision) &&
    !comment
  ) {
    return NextResponse.json({ error: "请填写人工审核意见" }, { status: 400 });
  }

  const hasProgress = Boolean(body.evidenceStates);
  if (!body.decision && !hasProgress) {
    return NextResponse.json({ error: "没有可保存的审核内容" }, { status: 400 });
  }

  if (body.evidenceStates) {
    const invalidEvidenceState = Object.values(body.evidenceStates).some(
      (state) => !["verified", "problem", "missing"].includes(state)
    );
    if (invalidEvidenceState) {
      return NextResponse.json({ error: "无效的证据核验状态" }, { status: 400 });
    }
  }

  const { data, error } = await access.supabase.rpc(
    "wpi_submit_equipment_price_review",
    {
      review_id: id,
      decision: body.decision ?? null,
      comment: comment || null,
      evidence_states: body.evidenceStates ?? null,
      resolved_issue_ids: body.resolvedIssueIds ?? [],
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const review = (data as {
    review?: {
      source_kind?: string;
      equipment_price_id?: string | null;
      import_row_id?: string | null;
    };
  } | null)?.review ?? {};

  return NextResponse.json({
    data: review,
    importResult:
      review.source_kind === "import" && body.decision === "approve"
        ? {
            equipmentPriceId: review.equipment_price_id ?? null,
            importRowId: review.import_row_id ?? null,
          }
        : null,
    source: "supabase",
  });
}
