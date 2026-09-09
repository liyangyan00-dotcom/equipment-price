import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { loadNavigationCounts } from "@/lib/data/navigationCounts";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  return loadNavigationCounts(access);
}
