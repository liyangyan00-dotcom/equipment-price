import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { verifyCollectionSource } from "@/lib/priceCollection/sourceValidator";

const writableRoles = new Set(["admin", "manager", "editor"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeBrand(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "");
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const result = await access.supabase
    .from("wpi_equipment_manufacturers")
    .select("id,official_name,local_name,brand,website_url,country_code,status,notes,created_at,updated_at")
    .eq("organization_id", access.organizationId)
    .neq("status", "inactive")
    .order("official_name", { ascending: true });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ manufacturers: result.data ?? [] });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有厂家主数据维护权限" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const officialName = text(body.officialName, 180);
  const localName = text(body.localName, 180);
  const brand = text(body.brand, 120);
  const websiteUrl = text(body.websiteUrl, 600);
  const countryCode = text(body.countryCode, 8).toUpperCase();
  const notes = text(body.notes, 600);
  const bindWebsite = body.bindWebsite === true;
  if (!officialName || !brand) {
    return NextResponse.json({ error: "厂家规范名称和品牌不能为空" }, { status: 400 });
  }
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ error: "官网地址必须是有效的 HTTPS 地址" }, { status: 400 });
    }
  }

  let verifiedWebsite: Awaited<ReturnType<typeof verifyCollectionSource>> | null = null;
  if (bindWebsite) {
    if (!websiteUrl) return NextResponse.json({ error: "保存并绑定来源必须填写官网地址" }, { status: 400 });
    try {
      verifiedWebsite = await verifyCollectionSource(websiteUrl, [new URL(websiteUrl).hostname.toLowerCase()]);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "官网验证失败" }, { status: 422 });
    }
  }

  const result = await access.supabase
    .from("wpi_equipment_manufacturers")
    .insert({
      organization_id: access.organizationId,
      official_name: officialName,
      local_name: localName,
      brand,
      normalized_brand: normalizeBrand(brand),
      website_url: websiteUrl || null,
      country_code: countryCode,
      status: "pending",
      notes,
      metadata: { createdFrom: "equipment-catalog-collection" },
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select("id,official_name,local_name,brand,website_url,country_code,status,notes,created_at,updated_at")
    .single();
  if (result.error) {
    const duplicate = result.error.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "该品牌已登记，请直接从列表选择" : result.error.message },
      { status: duplicate ? 409 : 500 },
    );
  }

  let source = null;
  let sourceWarning = "";
  if (bindWebsite && verifiedWebsite) {
    const sourceTable = access.supabase.from("wpi_price_collection_sources");
    const existingSource = await sourceTable
      .select("id,config")
      .eq("organization_id", access.organizationId)
      .eq("base_url", verifiedWebsite.url)
      .maybeSingle();
    if (existingSource.error) {
      sourceWarning = `厂家已保存，但官网来源查询失败：${existingSource.error.message}`;
    } else if (existingSource.data) {
      const updatedSource = await sourceTable
        .update({
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_error: null,
          config: {
            ...(existingSource.data.config ?? {}),
            targetType: "equipment",
            catalogSourceType: "manufacturer_site",
            brand,
            sourceOwnerType: "manufacturer",
            sourceOwnerId: result.data.id,
            sourceOwnerName: officialName,
            canonicalBrand: brand,
            requiresHumanReview: true,
            aiFinalDecision: false,
            identifiedFromWebsite: true,
          },
          updated_by: access.userId,
        })
        .eq("organization_id", access.organizationId)
        .eq("id", existingSource.data.id)
        .select("*")
        .single();
      if (updatedSource.error) sourceWarning = `厂家已保存，但已有官网来源绑定失败：${updatedSource.error.message}`;
      else source = updatedSource.data;
    } else {
      const sourceCode = `MFR_${normalizeBrand(brand).toUpperCase().slice(0, 36)}_${Date.now().toString().slice(-8)}`;
      const sourceResult = await sourceTable.insert({
        organization_id: access.organizationId,
        source_code: sourceCode,
        name: `${brand} 厂家官网`,
        source_kind: "web",
        base_url: verifiedWebsite.url,
        allowed_hosts: [new URL(verifiedWebsite.url).hostname.toLowerCase()],
        allowed_path_prefixes: ["/"],
        is_active: true,
        robots_policy: "respect",
        rate_limit_per_minute: 6,
        default_currency: "CNY",
        quality_score: 80,
        extraction_strategy: "structured_data",
        discovery_enabled: true,
        max_discovery_depth: 2,
        config: {
          targetType: "equipment",
          catalogSourceType: "manufacturer_site",
          brand,
          sourceOwnerType: "manufacturer",
          sourceOwnerId: result.data.id,
          sourceOwnerName: officialName,
          canonicalBrand: brand,
          requiresHumanReview: true,
          aiFinalDecision: false,
          identifiedFromWebsite: true,
        },
        last_checked_at: new Date().toISOString(),
        last_error: null,
        created_by: access.userId,
        updated_by: access.userId,
        })
        .select("*")
        .single();
      if (sourceResult.error) sourceWarning = `厂家已保存，但官网来源创建失败：${sourceResult.error.message}`;
      else source = sourceResult.data;
    }
  }
  return NextResponse.json({ manufacturer: result.data, source, sourceWarning }, { status: 201 });
}
