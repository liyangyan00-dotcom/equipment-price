import type { getApiAccess } from "@/lib/auth/apiAccess";

type ApiAccess = Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>;
export const attachmentReviewRoles = new Set(["admin", "manager", "reviewer"]);
export type AttachmentReviewer = { user_id: string; role: string };

// The roster and mutation RPCs use the same database permission predicate,
// including active membership and organization permission overrides.
export async function attachmentReviewers(access: ApiAccess) {
  const result = await access.supabase.rpc("wpi_attachment_reviewers", {
    target_organization_id: access.organizationId,
  });
  if (result.error) throw new Error("附件审核权限读取失败");
  if (!Array.isArray(result.data)) throw new Error("附件审核权限读取失败");
  return result.data as AttachmentReviewer[];
}

export async function canReviewAttachments(access: ApiAccess) {
  if (!attachmentReviewRoles.has(access.role)) return false;
  return (await attachmentReviewers(access)).some((member) => member.user_id === access.userId);
}
