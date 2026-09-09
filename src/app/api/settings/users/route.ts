import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type FunctionError = Error & { context?: Response };

async function invokeUserManagement(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  body: Record<string, unknown>,
) {
  if (access.role !== "admin") {
    return { ok: false as const, status: 403, error: "仅系统管理员可管理组织用户" };
  }

  const { data, error } = await access.supabase.functions.invoke("wpi-user-management", { body });
  if (!error) return { ok: true as const, data };

  const functionError = error as FunctionError;
  let detail = functionError.message || "用户管理服务调用失败";
  const status = functionError.context?.status || 502;
  if (functionError.context) {
    try {
      const payload = (await functionError.context.clone().json()) as { error?: string };
      detail = payload.error || detail;
    } catch {
      // Preserve the Functions client error when the response is not JSON.
    }
  }
  return { ok: false as const, status, error: detail };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const result = await invokeUserManagement(access, { action: "list" });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = input.action === "reset_password" ? "reset_password" : "invite";
  const body = {
    ...input,
    action,
    redirectTo:
      action === "reset_password"
        ? `${request.nextUrl.origin}/login?mode=reset-password`
        : `${request.nextUrl.origin}/login?mode=accept-invite`,
  };
  const result = await invokeUserManagement(access, body);
  return result.ok
    ? NextResponse.json(result.data, { status: action === "invite" ? 201 : 200 })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await invokeUserManagement(access, { ...input, action: "update" });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function PUT(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await invokeUserManagement(access, { ...input, action: "activity" });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: result.error }, { status: result.status });
}
