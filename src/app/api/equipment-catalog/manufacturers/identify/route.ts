import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { fetchCollectionWebsite } from "@/lib/priceCollection/sourceValidator";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (property !== key.toLowerCase()) continue;
    return decodeHtml(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]?.trim() ?? "");
  }
  return "";
}

function jsonLdOrganizations(html: string) {
  const results: Array<{ name?: string; legalName?: string; alternateName?: string; url?: string }> = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const queue: unknown[] = [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (Array.isArray(item)) {
          queue.push(...item);
          continue;
        }
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (Array.isArray(record["@graph"])) queue.push(...record["@graph"]);
        const rawType = record["@type"];
        const types = Array.isArray(rawType) ? rawType.map(String) : [String(rawType ?? "")];
        if (types.some((type) => ["Organization", "Corporation", "Brand", "Manufacturer"].includes(type))) {
          results.push({
            name: text(record.name, 180),
            legalName: text(record.legalName, 180),
            alternateName: text(record.alternateName, 180),
            url: text(record.url, 600),
          });
        }
      }
    } catch {
      // Invalid JSON-LD is ignored; title and Open Graph remain available.
    }
  }
  return results;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "");
}

function registrableLabel(hostname: string) {
  const parts = hostname.replace(/^www\./, "").split(".");
  const compoundCountrySuffixes = new Set([
    "com.cn",
    "net.cn",
    "org.cn",
    "gov.cn",
    "com.hk",
    "com.tw",
    "co.uk",
    "co.jp",
    "co.kr",
    "com.au",
  ]);
  const suffix = parts.slice(-2).join(".").toLowerCase();
  if (parts.length >= 3 && compoundCountrySuffixes.has(suffix)) {
    return parts[parts.length - 3];
  }
  return parts.length > 1 ? parts[parts.length - 2] : parts[0];
}

function hostnameOf(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await request.json()) as Record<string, unknown>;
  const websiteUrl = text(body.websiteUrl, 600);
  if (!websiteUrl) return NextResponse.json({ error: "请填写厂家官网" }, { status: 400 });

  try {
    const snapshot = await fetchCollectionWebsite(websiteUrl);
    const title = decodeHtml(snapshot.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "");
    const siteName = metaContent(snapshot.html, "og:site_name");
    const organizations = jsonLdOrganizations(snapshot.html);
    const organization = organizations.find((item) => item.legalName || item.name);
    const brand = organization?.alternateName || siteName || registrableLabel(snapshot.hostname).toUpperCase();
    const officialName = organization?.legalName || organization?.name || siteName || title.split(/[|｜—–-]/)[0]?.trim() || brand;
    const language = snapshot.html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1] ?? "";
    const confidence = organization?.legalName ? 92 : organization?.name ? 86 : siteName ? 76 : 62;

    const [manufacturersResult, suppliersResult] = await Promise.all([
      access.supabase
        .from("wpi_equipment_manufacturers")
        .select("id,official_name,local_name,brand,website_url,country_code,status")
        .eq("organization_id", access.organizationId)
        .limit(1000),
      access.supabase
        .from("wpi_suppliers")
        .select("id,name,legal_name,website,country_code,review_status")
        .eq("organization_id", access.organizationId)
        .limit(1000),
    ]);
    if (manufacturersResult.error || suppliersResult.error) {
      throw new Error(manufacturersResult.error?.message || suppliersResult.error?.message);
    }
    const host = snapshot.hostname.replace(/^www\./, "");
    const candidateValues = [officialName, brand].map(normalize).filter(Boolean);
    const manufacturerDuplicates = (manufacturersResult.data ?? []).map((item) => {
      const itemHost = hostnameOf(item.website_url);
      const exactDomain = Boolean(itemHost && itemHost === host);
      const exactName = [item.official_name, item.local_name, item.brand].map(normalize).some((value) => value && candidateValues.includes(value));
      return { type: "manufacturer" as const, ...item, score: exactDomain ? 100 : exactName ? 92 : 0, reason: exactDomain ? "官网域名相同" : exactName ? "厂家或品牌名称相同" : "" };
    }).filter((item) => item.score > 0);
    const supplierDuplicates = (suppliersResult.data ?? []).map((item) => {
      const itemHost = hostnameOf(item.website);
      const exactDomain = Boolean(itemHost && itemHost === host);
      const exactName = [item.name, item.legal_name].map((value) => normalize(value ?? "")).some((value) => value && candidateValues.includes(value));
      return { type: "supplier" as const, ...item, score: exactDomain ? 98 : exactName ? 82 : 0, reason: exactDomain ? "供应商官网域名相同" : exactName ? "供应商名称与厂家候选相似" : "" };
    }).filter((item) => item.score > 0);

    return NextResponse.json({
      candidate: {
        officialName,
        localName: "",
        brand,
        websiteUrl: snapshot.finalUrl,
        countryCode: "",
        language,
        confidence,
      },
      evidence: [
        { label: "最终官网", value: snapshot.finalUrl },
        ...(organization?.legalName ? [{ label: "Schema.org legalName", value: organization.legalName }] : []),
        ...(organization?.name ? [{ label: "Schema.org name", value: organization.name }] : []),
        ...(siteName ? [{ label: "Open Graph 站点名", value: siteName }] : []),
        ...(title ? [{ label: "网页标题", value: title }] : []),
      ],
      duplicates: [...manufacturerDuplicates, ...supplierDuplicates].sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "官网识别失败" }, { status: 422 });
  }
}
