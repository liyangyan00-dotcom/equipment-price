import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "reviewer" | "editor" | "viewer";

export type CurrentAccess = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: AppRole;
};

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

export async function getCurrentAccess(): Promise<CurrentAccess | null> {
  const { supabase, userId } = await requireUser();
  const { data: membership } = await supabase
    .from("wpi_organization_members")
    .select("organization_id, role, wpi_organizations(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  const organization = membership.wpi_organizations as { name?: string } | null;
  return {
    userId,
    organizationId: membership.organization_id as string,
    organizationName: organization?.name ?? "水厂价格情报工作组",
    role: membership.role as AppRole,
  };
}
