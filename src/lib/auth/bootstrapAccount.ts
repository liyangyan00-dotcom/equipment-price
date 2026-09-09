import type { SupabaseClient } from "@supabase/supabase-js";

export async function bootstrapAccount(
  supabase: SupabaseClient,
  userId: string,
  organizationName = "水厂价格情报工作组"
) {
  const { data: membership, error: membershipError } = await supabase
    .from("wpi_organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }
  if (membership) {
    return membership.organization_id as string;
  }

  const code = `WPI-${userId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const { data: organization, error: organizationError } = await supabase
    .from("wpi_organizations")
    .insert({
      code,
      name: organizationName,
      created_by: userId,
    })
    .select("id")
    .single();

  if (organizationError) {
    throw organizationError;
  }

  return organization.id as string;
}
