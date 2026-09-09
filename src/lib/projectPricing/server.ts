import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const projectPricingWriteRoles = new Set(["admin", "manager", "editor"]);
export const projectPricingReviewRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export type ProjectPricingItemRecord = {
  id: string;
  project_id: string;
  boq_code: string;
  line_no: number;
  item_name: string;
  specification: string;
  category: "equipment" | "material" | "service";
  quantity: number;
  unit: string;
  matched_unit_price: number | null;
  currency: string;
  normalized_usd_price: number | null;
  price_source_type: string;
  source_record_id: string | null;
  source_legacy_id: string | null;
  supplier_id: string | null;
  confidence: number;
  match_level: "exact" | "similar" | "type" | "model" | "unmatched";
  risk_level: "low" | "medium" | "high" | "critical";
  needs_inquiry: boolean;
  decision_status: "gap" | "ai_recommended" | "manual_selected" | "confirmed";
  evidence_count: number;
  notes: string;
  metadata: Record<string, unknown>;
  supplier?: { name?: string } | null;
};

export type ProjectPricingProjectSummary = {
  id: string;
  project_code: string;
  name: string;
  status: string;
  project_stage: string;
  base_currency: string;
  price_term: string;
  exchange_rate: number;
  valid_until: string | null;
  risk_level: "low" | "medium" | "high" | "critical";
  updated_at: string;
  metadata: Record<string, unknown>;
  summary: ReturnType<typeof pricingSummary> & {
    inquiryLinkedItems: number;
    inquiryQuoteItems: number;
    confirmedItems: number;
  };
};

export function pricingSummary(items: ProjectPricingItemRecord[]) {
  const matched = items.filter((item) => item.matched_unit_price !== null);
  const confirmed = matched.filter((item) => item.decision_status === "confirmed");
  const gaps = items.filter((item) => item.needs_inquiry || item.match_level === "unmatched");
  const total = matched.reduce((sum, item) => sum + Number(item.normalized_usd_price ?? 0) * Number(item.quantity), 0);
  const confirmedTotal = confirmed.reduce((sum, item) => sum + Number(item.normalized_usd_price ?? 0) * Number(item.quantity), 0);
  const highRisk = items.filter((item) => item.risk_level === "high" || item.risk_level === "critical").length;
  return {
    totalItems: items.length,
    matchedItems: matched.length,
    gapItems: gaps.length,
    highRiskItems: highRisk,
    totalUsd: Math.round(total * 100) / 100,
    confirmedUsd: Math.round(confirmedTotal * 100) / 100,
    averageConfidence: items.length
      ? Math.round(items.reduce((sum, item) => sum + Number(item.confidence), 0) / items.length * 10) / 10
      : 0,
  };
}

async function attachInquiryStatuses(
  supabase: SupabaseClient,
  organizationId: string,
  items: ProjectPricingItemRecord[],
): Promise<ProjectPricingItemRecord[]> {
  const inquiryIds = [...new Set(items.map((item) => {
    const value = item.metadata?.inquiryId;
    return typeof value === "string" ? value : "";
  }).filter(Boolean))];
  if (!inquiryIds.length) return items;

  const inquiries = await supabase.from("wpi_inquiries")
    .select("id,status")
    .eq("organization_id", organizationId)
    .in("id", inquiryIds);
  if (inquiries.error) throw inquiries.error;
  const statusById = new Map<string, string>((inquiries.data ?? []).map((inquiry) => [inquiry.id, String(inquiry.status)]));
  return items.map((item) => {
    const inquiryId = typeof item.metadata?.inquiryId === "string" ? item.metadata.inquiryId : "";
    return inquiryId
      ? { ...item, metadata: { ...item.metadata, inquiryStatus: statusById.get(inquiryId) ?? "missing" } as Record<string, unknown> }
      : item;
  });
}

export async function loadProjectPricing(supabase: SupabaseClient, organizationId: string, projectId?: string) {
  let projectQuery = supabase.from("wpi_projects").select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (projectId) projectQuery = projectQuery.eq("id", projectId);
  const projectResult = await projectQuery.maybeSingle();
  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) return null;

  const itemResult = await supabase.from("wpi_project_pricing_items")
    .select("*, supplier:wpi_suppliers(name)")
    .eq("organization_id", organizationId)
    .eq("project_id", projectResult.data.id)
    .order("line_no", { ascending: true });
  if (itemResult.error) throw itemResult.error;
  const loadedItems = ((itemResult.data ?? []) as unknown as ProjectPricingItemRecord[]).map((item) => ({
    ...item,
    supplier: item.supplier ? { ...item.supplier, supplier_name: item.supplier.name } : null,
  }));
  const items = await attachInquiryStatuses(supabase, organizationId, loadedItems);
  return { project: projectResult.data, items, summary: pricingSummary(items) };
}

export async function listProjectPricingProjects(supabase: SupabaseClient, organizationId: string) {
  const projectResult = await supabase.from("wpi_projects")
    .select("id,project_code,name,status,project_stage,base_currency,price_term,exchange_rate,valid_until,risk_level,updated_at,metadata")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (projectResult.error) throw projectResult.error;
  const projects = projectResult.data ?? [];
  if (!projects.length) return [] as ProjectPricingProjectSummary[];

  const itemResult = await supabase.from("wpi_project_pricing_items")
    .select("project_id,matched_unit_price,normalized_usd_price,quantity,needs_inquiry,risk_level,price_source_type,decision_status,confidence,match_level,metadata")
    .eq("organization_id", organizationId)
    .in("project_id", projects.map((project) => project.id));
  if (itemResult.error) throw itemResult.error;

  const statusAwareItems = await attachInquiryStatuses(
    supabase,
    organizationId,
    (itemResult.data ?? []) as unknown as ProjectPricingItemRecord[],
  );
  const itemsByProject = new Map<string, ProjectPricingItemRecord[]>();
  for (const item of statusAwareItems) {
    const projectItems = itemsByProject.get(item.project_id);
    if (projectItems) projectItems.push(item);
    else itemsByProject.set(item.project_id, [item]);
  }

  return projects.map((project) => {
    const items = itemsByProject.get(project.id) ?? [];
    const summary = pricingSummary(items);
    return {
      ...project,
      exchange_rate: Number(project.exchange_rate),
      metadata: (project.metadata as Record<string, unknown> | null) ?? {},
      summary: {
        ...summary,
        inquiryLinkedItems: items.filter((item) => Boolean(item.metadata?.inquiryId)).length,
        inquiryQuoteItems: items.filter((item) => item.price_source_type === "inquiry_quote" || Boolean(item.metadata?.inquiryQuoteReceivedAt)).length,
        confirmedItems: items.filter((item) => item.decision_status === "confirmed").length,
      },
    } as ProjectPricingProjectSummary;
  });
}

export function createProjectCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PRJ-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
