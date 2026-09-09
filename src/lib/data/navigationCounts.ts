import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { NavigationCounts } from "@/config/navigation";
import type { TopbarAiMode } from "@/types/topbar";

export async function loadNavigationCounts(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, includePreference = true) {

  const [priceReviews, inquiryReviews, pricingReviews, pricingGaps, preference] = await Promise.all([
    access.supabase
      .from("wpi_quote_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("review_status", ["pending_review", "needs_info"]),
    access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "pending_review"),
    access.supabase
      .from("wpi_project_pricing_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("decision_status", ["ai_recommended", "manual_selected"]),
    access.supabase
      .from("wpi_project_pricing_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("needs_inquiry", true),
    includePreference ? access.supabase
      .from("wpi_user_preferences")
      .select("ai_mode")
      .eq("organization_id", access.organizationId)
      .eq("user_id", access.userId)
      .maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const error = priceReviews.error || inquiryReviews.error || pricingReviews.error || pricingGaps.error || preference.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: NavigationCounts = {
    pendingPriceReviews: priceReviews.count ?? 0,
    pendingInquiryReviews: inquiryReviews.count ?? 0,
    projectPricingReviews: pricingReviews.count ?? 0,
    projectPricingGaps: pricingGaps.count ?? 0,
    projectPricingPending: (pricingReviews.count ?? 0) + (pricingGaps.count ?? 0),
  };

  return NextResponse.json({
    counts,
    aiMode: (preference.data?.ai_mode as TopbarAiMode | undefined) ?? "human_review",
    source: "supabase",
  });
}
