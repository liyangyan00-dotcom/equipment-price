import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const allowedActions = new Set(["start", "approve", "need_info"]);

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!["admin", "manager"].includes(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格审核权限" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    reviewIds?: string[];
    action?: string;
    comment?: string;
  };
  const reviewIds = [...new Set(body.reviewIds ?? [])].filter(Boolean);
  const action = body.action ?? "";
  const comment = body.comment?.trim() ?? "";

  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "无效的批量审核动作" }, { status: 400 });
  }
  if (reviewIds.length === 0) {
    return NextResponse.json({ error: "请先选择审核任务" }, { status: 400 });
  }
  if (reviewIds.length > 100) {
    return NextResponse.json({ error: "单次最多处理 100 条审核任务" }, { status: 400 });
  }
  if (["approve", "need_info"].includes(action) && !comment) {
    return NextResponse.json({ error: "请填写人工审核意见" }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc(
    "wpi_batch_review_equipment_prices",
    {
      review_ids: reviewIds,
      action,
      comment: comment || null,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, source: "supabase" });
}
