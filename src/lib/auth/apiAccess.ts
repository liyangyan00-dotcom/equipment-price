import { createClient } from "@/lib/supabase/server";
import { accessFailure } from "./accessFailure";

export async function getApiAccess() {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError && (accessFailure(claimsError).code === "restricted" || (claimsError.status != null && claimsError.status >= 500))) {
    return { ok: false as const, ...accessFailure(claimsError) };
  }
  if (claimsError || !userId) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("wpi_organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { ok: false as const, ...accessFailure(membershipError) };
  }
  if (!membership) {
    return { ok: false as const, status: 403, code: "no_organization", error: "登录成功，但当前账号尚未加入有效工作组。请联系管理员关联已有工作组后重新加载，原业务数据不会因此丢失。" };
  }

  return {
    ok: true as const,
    supabase,
    userId,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  };
}
