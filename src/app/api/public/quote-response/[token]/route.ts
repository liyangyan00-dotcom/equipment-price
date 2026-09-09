import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ token: string }> };

async function invokePortal(action: "load" | "submit", token: string, body?: unknown) {
  const config = getSupabasePublicConfig();
  const response = await fetch(`${config.url}/functions/v1/wpi-supplier-quote-portal`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, token, ...(body as object | undefined) }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({ error: "PORTAL_RESPONSE_INVALID" }))) as unknown;
  return { response, payload };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const result = await invokePortal("load", token);
  return NextResponse.json(result.payload, { status: result.response.status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await invokePortal("submit", token, body);
  return NextResponse.json(result.payload, { status: result.response.status });
}
