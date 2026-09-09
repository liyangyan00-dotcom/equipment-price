import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wpi-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const writableRoles = new Set(["admin", "manager", "editor"]);
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_ANALYSIS_CHARS = 800_000;
const REQUEST_TIMEOUT_MS = 15_000;
// Supabase Edge requests have a hard wall-clock limit. Finish a small batch
// before that limit and let the scheduler continue the remaining queue.
const EXECUTION_BUDGET_MS = 70_000;

type Json = Record<string, unknown>;
type SourceRow = {
  id: string;
  source_code: string;
  name: string;
  source_kind: "web" | "api";
  base_url: string;
  allowed_hosts: string[];
  allowed_path_prefixes: string[];
  robots_policy: "respect" | "manual_only";
  default_currency: string;
  default_region: string | null;
  quality_score: number;
  extraction_strategy: "structured_data" | "html_table" | "json_api";
  api_integration_id: string | null;
  discovery_enabled: boolean;
  max_discovery_depth: number;
  config: Json;
};
type TaskRow = {
  id: string;
  organization_id: string;
  target_type: "equipment" | "material";
  keyword: string;
  specification: string | null;
  region: string | null;
  currency: string;
  source_type: string;
  frequency: string;
  collection_mode: "web" | "api";
  status: string;
  config: Json;
  created_by: string;
  max_retries: number;
  retry_count: number;
  progress: number;
  success_count: number;
};
type SourceRunRow = {
  id: string;
  organization_id: string;
  task_id: string;
  parent_run_id: string;
  source_id: string;
  source_name: string;
  source_host: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
  progress: number;
  page_budget: number;
  pages_used: number;
  fetched_count: number;
  evidence_count: number;
  created_lead_count: number;
  updated_lead_count: number;
  duplicate_count: number;
  failed_count: number;
  attempt: number;
  max_retries: number;
};
type Candidate = {
  targetType: "equipment" | "material";
  name: string;
  specification: string;
  price: number;
  currency: string;
  unit: string;
  supplierName: string;
  region: string;
  sourceType: string;
  matchTarget: string;
  matchScore: number;
  sourceQuality: number;
  validationStatus: "valid" | "needs_review" | "invalid";
  validationReasons: string[];
  originalPriceText: string;
  quoteDate: string;
  priceContext: string;
  extractionMethod: "structured_data" | "page_text";
  pageKind: "product_detail";
  detailSignals: string[];
};

type CatalogParameterCandidate = {
  code: string;
  name: string;
  rawValue: string;
  normalizedValue: string;
  unit: string;
  isKey: boolean;
  confidence: number;
};

type CatalogCandidate = {
  equipmentName: string;
  normalizedName: string;
  equipmentCategory: string;
  equipmentType: string;
  brand: string;
  manufacturer: string;
  productSeries: string;
  model: string;
  specification: string;
  application: string;
  technicalStandard: string;
  countryCode: string;
  language: string;
  datasheetUrl: string | null;
  catalogUrl: string;
  sourceUrl: string;
  confidence: number;
  completeness: number;
  riskLevel: "low" | "medium" | "high";
  parameters: CatalogParameterCandidate[];
  metadata: Json;
};

type RuntimeIntegration = {
  integration_id: string;
  endpoint_url: string | null;
  credential_state: string;
  config: Json;
  credential_secret: string | null;
};

type DiscoveredLink = {
  url: string;
  title: string;
  type: "page" | "product" | "catalog" | "pdf";
  metadata?: Json;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  const record = object(value);
  return (
    text(record.message) ||
    text(record.details) ||
    text(record.hint) ||
    text(value) ||
    "来源采集失败"
  );
}

function number(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function runInBackground(promise: Promise<unknown>) {
  const runtime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (pending: Promise<unknown>) => void };
  }).EdgeRuntime;
  if (runtime) runtime.waitUntil(promise);
  else void promise;
}

async function dispatchSourceRuns(
  admin: SupabaseClient,
  supabaseUrl: string,
  cronSecret: string,
  concurrency = 3,
  authorization = "",
) {
  const reconciled = await admin.rpc("wpi_reconcile_stale_price_collection_runs", {
    stale_after: "10 minutes",
  });
  if (reconciled.error) throw reconciled.error;

  const claimed = await admin.rpc("wpi_claim_due_price_collection_source_runs", {
    batch_size: Math.max(1, Math.min(8, concurrency)),
  });
  if (claimed.error) throw claimed.error;
  const sourceRuns = (claimed.data || []) as SourceRunRow[];
  if (sourceRuns.length) {
    const parentRunIds = [...new Set(sourceRuns.map((sourceRun) => sourceRun.parent_run_id))];
    const parentRuns = await admin
      .from("wpi_price_collection_runs")
      .select("id,trigger_type")
      .in("id", parentRunIds);
    if (parentRuns.error) throw parentRuns.error;
    const parentTriggerTypes = new Map(
      (parentRuns.data || []).map((parentRun) => [
        String(parentRun.id),
        text(parentRun.trigger_type) || "schedule",
      ]),
    );
    runInBackground(Promise.all(sourceRuns.map(async (sourceRun) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cronSecret) headers["x-wpi-cron-secret"] = cronSecret;
      else if (authorization) headers.Authorization = authorization;
      const response = await fetch(`${supabaseUrl}/functions/v1/wpi-price-collector`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          taskId: sourceRun.task_id,
          sourceRunId: sourceRun.id,
          sourceId: sourceRun.source_id,
          triggerType: parentTriggerTypes.get(sourceRun.parent_run_id) || "schedule",
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        await admin.from("wpi_price_collection_source_runs").update({
          status: sourceRun.attempt < sourceRun.max_retries ? "partial" : "failed",
          error_message: text(object(payload).error) || `来源 Worker HTTP ${response.status}`,
          next_run_at: new Date(
            Date.now() + Math.min(60, 10 * 2 ** Math.max(0, sourceRun.attempt - 1)) * 1000,
          ).toISOString(),
          finished_at: new Date().toISOString(),
        }).eq("id", sourceRun.id);
        await admin.rpc("wpi_refresh_price_collection_parent_run", {
          target_parent_run_id: sourceRun.parent_run_id,
        });
      }
    })));
  }
  return sourceRuns;
}

function dispatchLeadTranslation(
  supabaseUrl: string,
  serviceRoleKey: string,
  organizationId: string,
  taskId: string,
  requestedBy: string,
  leadIds: string[],
) {
  const uniqueLeadIds = Array.from(new Set(leadIds.filter(Boolean)));
  if (!uniqueLeadIds.length) return;
  const batches = Array.from(
    { length: Math.ceil(uniqueLeadIds.length / 20) },
    (_, index) => uniqueLeadIds.slice(index * 20, index * 20 + 20),
  );
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  runInBackground((async () => {
    for (const batch of batches) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/wpi-ai-gateway`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: "translate_price_leads",
            organizationId,
            taskId,
            requestedBy,
            leadIds: batch,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(text(object(payload).error) || `翻译 Worker HTTP ${response.status}`);
        }
      } catch (error) {
        await admin.from("wpi_price_collection_leads").update({
          translation_status: "failed",
          translation_risk_level: "high",
          translation_metadata: {
            error: errorMessage(error),
            requiresHumanReview: true,
            retryable: true,
          },
        }).in("id", batch);
      }
    }
  })());
}

function knownMaterialTranslation(candidate: Candidate) {
  const sourceText = `${candidate.name} ${candidate.specification} ${candidate.unit}`;
  if (!/BARRE\s+DE\s+FER/i.test(sourceText)) return null;
  const diameterMatch = sourceText.match(/(?:PIECE\s+)?BARRE\s+DE\s+(\d+(?:[.,]\d+)?)/i);
  if (!diameterMatch) return null;
  const diameter = Number(diameterMatch[1].replace(",", "."));
  if (!Number.isFinite(diameter) || diameter <= 0) return null;
  const averageLabel = /省级均价/.test(candidate.specification) ? " · 省级均价" : "";
  return {
    translated_name: "钢筋",
    translated_specification: `钢筋 · Φ${diameter} mm · 按根${averageLabel}`,
    translation_status: "needs_review",
    translation_confidence: 98,
    translation_risk_level: "medium",
    translation_review_status: "pending_review",
    translation_provider: "RULE_ENGINE",
    translation_model: "material-terminology-v1",
    translation_review_note: "术语已按工程材料规则标准化；原始来源未注明单根长度和钢筋牌号，需人工复核。",
    translation_metadata: {
      deterministicRule: "talo_rebar_diameter_v1",
      diameterMm: diameter,
      saleUnit: "piece",
      lengthSpecified: false,
      warnings: ["长度及钢筋牌号未注明"],
      requiresHumanReview: true,
    },
  };
}

function localizedPrice(value: unknown) {
  const raw = String(value ?? "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  let normalized = raw;
  if (comma > dot) normalized = raw.replace(/\./g, "").replace(",", ".");
  else normalized = raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stableCode(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function unavailablePageReason(body: string) {
  const plain = stripHtml(body).toLowerCase().slice(0, 20_000);
  const markers = [
    "this domain is temporarily unavailable",
    "domain has expired",
    "domain is parked",
    "website coming soon",
    "site is under construction",
    "service unavailable",
    "access denied",
    "temporarily unavailable",
  ];
  const marker = markers.find((value) => plain.includes(value));
  return marker ? `来源页面不可用：${marker}` : "";
}

function normalizedHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

function isPrivateHost(host: string) {
  const value = normalizedHost(host);
  if (
    value === "localhost" ||
    value.endsWith(".local") ||
    value.endsWith(".internal")
  )
    return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(value)) return true;
  const private172 = value.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31)
    return true;
  if (
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  )
    return true;
  return false;
}

function validateSourceUrl(rawUrl: string, source: SourceRow) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("仅允许 HTTPS 采集来源");
  if (url.username || url.password || url.port)
    throw new Error("采集地址不能包含凭据或自定义端口");
  if (isPrivateHost(url.hostname)) throw new Error("禁止访问本机或内网地址");
  const allowedHosts = source.allowed_hosts.map(normalizedHost);
  const host = normalizedHost(url.hostname);
  if (
    !allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    )
  ) {
    throw new Error(`来源主机 ${url.hostname} 不在白名单`);
  }
  if (
    !source.allowed_path_prefixes.some((prefix) =>
      url.pathname.startsWith(prefix || "/"),
    )
  ) {
    throw new Error("采集地址不在允许路径范围");
  }
  return url;
}

function robotsDisallows(robots: string, path: string) {
  let applies = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent")
      applies =
        value === "*" || value.toLowerCase().includes("wpi-price-collector");
    if (applies && key === "disallow" && value && path.startsWith(value))
      return true;
  }
  return false;
}

async function checkRobots(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${url.origin}/robots.txt`, {
      signal: controller.signal,
      redirect: "error",
      headers: { "User-Agent": "WPI-Price-Collector/1.0" },
    });
    if (!response.ok) return;
    const body = (await response.text()).slice(0, 200_000);
    if (robotsDisallows(body, url.pathname))
      throw new Error("robots.txt 禁止采集该路径");
  } finally {
    clearTimeout(timeout);
  }
}

type FetchedSource = {
  response: Pick<Response, "url" | "status">;
  contentType: string;
  body: string;
};

async function fetchSource(
  initialUrl: URL,
  source: SourceRow,
  extraHeaders: Record<string, string> = {},
): Promise<FetchedSource> {
  let url = initialUrl;
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
          "User-Agent": "WPI-Price-Collector/1.0 (+business-price-evidence)",
          ...extraHeaders,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("采集来源返回无目标地址的重定向");
      url = validateSourceUrl(new URL(location, url).toString(), source);
      continue;
    }
    if (!response.ok) throw new Error(`来源返回 HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_RESPONSE_BYTES)
      throw new Error("来源响应超过 2 MB 安全上限");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESPONSE_BYTES)
      throw new Error("来源响应超过 2 MB 安全上限");
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/json") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error(`不支持的来源内容类型：${contentType}`);
    }
    return {
      response,
      contentType,
      body: new TextDecoder().decode(bytes).slice(0, MAX_ANALYSIS_CHARS),
    };
  }
  throw new Error("采集来源重定向次数超过 5 次");
}

function taskMaterialKeywords(task: TaskRow) {
  const configured = Array.isArray(task.config.materialKeywords)
    ? task.config.materialKeywords.map(text).filter(Boolean)
    : [];
  const parsed = task.keyword
    .split(/[、,，;；|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set([...configured, ...parsed]));
}

function taloProductsForTask(task: TaskRow, source: SourceRow) {
  const keywords = taskMaterialKeywords(task);
  const aliases: Array<[RegExp, string]> = [
    [/(?:水泥|ciment|cement)/i, "CIMENT"],
    [/(?:钢筋|螺纹钢|fer\s*(?:a|à)\s*beton|rebar)/i, "BARRE DE FER"],
    [/(?:铁钉|钉子|clous?)/i, "CLOUS"],
    [/(?:角钢|corniere|cornière)/i, "CORNIERE"],
    [/(?:彩钢板|铁皮|钢板|tole|tôle)/i, "TOLE"],
    [/(?:方管|矩形管|tube\s+carre|tube\s+carré)/i, "TUBE CARRE"],
  ];
  const products = keywords.flatMap((keyword) =>
    aliases.filter(([pattern]) => pattern.test(keyword)).map(([, product]) => product)
  );
  return Array.from(new Set(products.length
    ? products
    : [text(source.config.taloDefaultProduct) || "CIMENT"]));
}

function taloProvincesForTask(
  task: TaskRow,
  source: SourceRow,
  availableProvinces: string[],
) {
  const configured = text(task.region || source.default_region || "KINSHASA");
  if (/nationwide|全国/i.test(configured)) return availableProvinces;
  const requested = (configured.split("/")[0] || "KINSHASA").trim().toUpperCase();
  const cityProvinceMap: Record<string, string> = {
    KINSHASA: "KINSHASA",
    MATADI: "KONGO CENTRAL",
    BOMA: "KONGO CENTRAL",
    MOANDA: "KONGO CENTRAL",
    LUBUMBASHI: "HAUT-KATANGA",
    LIKASI: "HAUT-KATANGA",
    KOLWEZI: "LUALABA",
    KIKWIT: "KWILU",
    BANDUNDU: "KWILU",
    MBANDAKA: "EQUATEUR",
    ISIRO: "HAUT-UELE",
    KANANGA: "KASAI CENTRAL",
    "MBUJI-MAYI": "KASAI-ORIENTAL",
    TSHIKAPA: "KASAI",
    KISANGANI: "TSHOPO",
    GOMA: "NORD-KIVU",
    BENI: "NORD-KIVU",
  };
  const province = cityProvinceMap[requested] || requested;
  if (availableProvinces.includes(province)) return [province];
  const fallback = availableProvinces.includes("KINSHASA")
    ? "KINSHASA"
    : availableProvinces[0];
  return fallback ? [fallback] : [];
}

function taloUnitsForTask(
  task: TaskRow,
  product: string,
  availableUnits: string[],
  defaultLimit: number,
) {
  if (product !== "BARRE DE FER") return availableUnits.slice(0, defaultLimit);

  const diameterFromUnit = (value: string) => {
    const match = value.match(/BARRE\s+DE\s+(\d+(?:[.,]\d+)?)/i);
    return match ? Number(match[1].replace(",", ".")) : null;
  };
  const requestedText = `${task.keyword || ""} ${task.specification || ""}`;
  const requestedDiameters = Array.from(
    requestedText.matchAll(/(?:Φ|φ|Ø|ø|直径)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm|毫米)/gi),
  ).map((match) => Number(match[1].replace(",", ".")));

  const diameterUnits = availableUnits
    .map((unit) => ({ unit, diameter: diameterFromUnit(unit) }))
    .filter((item): item is { unit: string; diameter: number } => item.diameter !== null)
    .sort((left, right) => left.diameter - right.diameter);
  if (!diameterUnits.length) return availableUnits.slice(0, defaultLimit);

  if (requestedDiameters.length) {
    return diameterUnits
      .filter((item) => requestedDiameters.includes(item.diameter))
      .map((item) => item.unit);
  }

  // TALO models rebar diameters as units. A broad rebar task must retain every
  // published diameter instead of silently keeping only the API's first unit.
  return diameterUnits.map((item) => item.unit);
}

function taloHistoryPeriods(year: number, month: number, requestedMonths: number) {
  const count = Math.max(1, Math.min(12, requestedMonths));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}

function normalizedMonth(value: unknown) {
  return normalizeMonthlyQuoteDate(value).slice(0, 7);
}

function taskPricePeriod(task: TaskRow) {
  const from = normalizedMonth(task.config.pricePeriodFrom);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const toMode = text(task.config.pricePeriodToMode);
  const configuredTo = normalizedMonth(task.config.pricePeriodTo);
  const to = toMode === "fixed_month" && configuredTo ? configuredTo : currentMonth;
  return {
    from,
    to,
    excludeUnknown: task.config.excludeUnknownPriceDate !== false,
  };
}

function taloPricePeriods(task: TaskRow, latestYear: number, latestMonth: number) {
  const range = taskPricePeriod(task);
  if (!range.from) {
    return taloHistoryPeriods(
      latestYear,
      latestMonth,
      Math.max(1, Math.min(12, number(task.config.priceHistoryMonths) || 1)),
    );
  }
  const latest = `${latestYear}-${String(latestMonth).padStart(2, "0")}`;
  const effectiveTo = range.to < latest ? range.to : latest;
  if (range.from > effectiveTo) return [];
  const [fromYear, fromMonth] = range.from.split("-").map(Number);
  const [toYear, toMonth] = effectiveTo.split("-").map(Number);
  const count = Math.min(36, (toYear - fromYear) * 12 + toMonth - fromMonth + 1);
  return taloHistoryPeriods(toYear, toMonth, count);
}

type PricePeriodDecision = "accepted" | "before_range" | "after_range" | "unknown_date";

function candidatePricePeriodDecision(candidate: Candidate, task: TaskRow): PricePeriodDecision {
  const range = taskPricePeriod(task);
  if (!range.from) return "accepted";
  const quoteMonth = normalizedMonth(candidate.quoteDate);
  if (!quoteMonth) return range.excludeUnknown ? "unknown_date" : "accepted";
  if (quoteMonth < range.from) return "before_range";
  if (quoteMonth > range.to) return "after_range";
  return "accepted";
}

async function fetchTaloJson(
  rawUrl: string,
  source: SourceRow,
  init: RequestInit = {},
) {
  const url = validateSourceUrl(rawUrl, source);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "error",
      headers: {
        Accept: "application/json",
        "User-Agent": "WPI-Price-Collector/1.0 (+business-price-evidence)",
        ...(init.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`TALO 返回 HTTP ${response.status}`);
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES)
      throw new Error("TALO 响应超过 2 MB 安全上限");
    return JSON.parse(body) as Json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTaloSource(
  source: SourceRow,
  task: TaskRow,
): Promise<FetchedSource> {
  const origin = new URL(source.base_url).origin;
  const products = taloProductsForTask(task, source);
  const multiProductRun = products.length > 1;
  const maxBrands = Math.max(
    1,
    Math.min(multiProductRun ? 1 : 6, number(source.config.taloMaxBrandsPerRun) || 3),
  );
  const maxUnits = Math.max(
    1,
    Math.min(3, number(source.config.taloMaxUnitsPerBrand) || 1),
  );
  const records: Json[] = [];

  for (const product of products) {
    const productFilters = await fetchTaloJson(
      `${origin}/talo/filters?produit=${encodeURIComponent(product)}`,
      source,
    );
    const category = text((productFilters.categories as Json[] | undefined)?.[0]?.name);
    if (!category) continue;
    const availableProvinces = Array.isArray(productFilters.provinces)
      ? (productFilters.provinces as Json[]).map((item) => text(item.name)).filter(Boolean)
      : [];
    const provinces = taloProvincesForTask(task, source, availableProvinces);
    if (!provinces.length) continue;
    const brandFilters = await fetchTaloJson(
      `${origin}/talo/filters?produit=${encodeURIComponent(product)}&categorie=${encodeURIComponent(category)}`,
      source,
    );
    const brands = Array.isArray(brandFilters.marques)
      ? (brandFilters.marques as Json[]).map((item) => text(item.name)).filter(Boolean)
      : [];
    const requestedBrand = `${task.keyword} ${task.specification || ""}`.toLowerCase();
    const preferredBrands = ["CIMKO", "CILU", "DANGOTE"];
    brands.sort((left, right) => {
      const requestedDifference =
        Number(requestedBrand.includes(right.toLowerCase())) -
        Number(requestedBrand.includes(left.toLowerCase()));
      if (requestedDifference) return requestedDifference;
      const leftRank = preferredBrands.indexOf(left.toUpperCase());
      const rightRank = preferredBrands.indexOf(right.toUpperCase());
      return (leftRank < 0 ? preferredBrands.length : leftRank) -
        (rightRank < 0 ? preferredBrands.length : rightRank);
    });
    const last = object(productFilters.last);
    const year = Math.max(2020, number(last.annee) || new Date().getUTCFullYear());
    const month = Math.max(1, Math.min(12, number(last.mois) || new Date().getUTCMonth() + 1));
    const periods = taloPricePeriods(task, year, month);
    const brandLimit = provinces.length > 1 ? 1 : maxBrands;
    for (const brand of brands.slice(0, brandLimit)) {
      const unitFilters = await fetchTaloJson(
        `${origin}/talo/filters?produit=${encodeURIComponent(product)}&categorie=${encodeURIComponent(category)}&marque=${encodeURIComponent(brand)}`,
        source,
      );
      const units = Array.isArray(unitFilters.unites)
        ? (unitFilters.unites as Json[]).map((item) => text(item.name)).filter(Boolean)
        : [];
      const selectedUnits = taloUnitsForTask(task, product, units, maxUnits);
      for (const unit of selectedUnits) {
        const aggregateHistory = periods.length > 1;
        const queryProvinces = aggregateHistory && provinces.length > 1 ? [""] : provinces;
        for (const period of periods) {
          for (const province of queryProvinces) {
            const payload = { province, zone: "TOUTES", produit: product, categorie: category, marque: brand, unite: unit, annee: period.year, mois: period.month };
            const data = await fetchTaloJson(`${origin}/talo/data`, source, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const global = object(data.global);
            const kpi = object(global.kpi);
            const averagePrice = number(kpi.prix_moyen);
            const periodLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
            if ((aggregateHistory || provinces.length > 1) && averagePrice > 0) {
              records.push({
                name: product,
                specification: `${brand} · ${unit} · ${aggregateHistory ? "月度均价" : "省级均价"}`,
                price: averagePrice,
                priceCurrency: "CDF",
                unit,
                supplierName: "Ministère de l'Économie nationale (TALO)",
                region: province ? `DRC / ${province}` : "DRC / NATIONAL",
                observationPeriod: periodLabel,
                quoteDate: `${periodLabel}-01`,
                sourceMethod: aggregateHistory ? "official_monthly_average" : "official_provincial_average",
              });
              continue;
            }
            const sites = Array.isArray(global.sites) ? global.sites as Json[] : [];
            for (const site of sites) {
              const price = number(site.prix_moyen);
              if (price <= 0) continue;
              records.push({
                name: product,
                specification: `${brand} · ${unit}`,
                price,
                priceCurrency: "CDF",
                unit,
                supplierName: "Ministère de l'Économie nationale (TALO)",
                region: `DRC / ${province} / ${text(site.site) || "TOUTES"}`,
                observationPeriod: periodLabel,
                quoteDate: `${periodLabel}-01`,
                sourceMethod: "official_market_observation",
              });
            }
          }
        }
      }
    }
  }

  if (!records.length) throw new Error(`TALO 未返回“${products.join("、")}”的有效价格`);

  const body = JSON.stringify({ records });
  return {
    response: { url: `${origin}/talo/data`, status: 200 },
    contentType: "application/json; charset=utf-8",
    body,
  };
}

function runtimeHeaders(runtime: RuntimeIntegration | null) {
  if (!runtime?.credential_secret) return {};
  let credential: Json;
  try {
    credential = object(JSON.parse(runtime.credential_secret));
  } catch {
    credential = { value: runtime.credential_secret };
  }
  const authType = text(
    credential.authType || runtime.config.authType || "bearer",
  ).toLowerCase();
  const value = text(credential.value || credential.apiKey || credential.token);
  if (!value) return {};
  if (authType === "api_key") {
    const headerName = text(
      credential.headerName || runtime.config.headerName || "X-API-Key",
    );
    return { [headerName]: value };
  }
  if (authType === "basic") {
    const username = text(credential.username);
    const password = text(credential.password);
    return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
  }
  const prefix = text(credential.prefix || "Bearer");
  return { Authorization: `${prefix} ${value}`.trim() };
}

function classifyDiscoveredLink(url: URL) {
  const value = `${url.pathname}${url.search}`.toLowerCase();
  if (
    /\/downloads?\/(?:\d+|[^/?#]+\.(?:pdf|docx?|xlsx?))(?:[/?#]|$)/.test(value) ||
    /\.pdf(?:$|[?#])/.test(value) ||
    value.includes("application=pdf") ||
    value.includes("mimetype=application%2fpdf")
  )
    return "pdf" as const;
  if (
    /(catalog|catalogue|download|downloads|document|technical|specification|product-finder|product\/product|products\/catalog)/.test(
      value,
    )
  )
    return "catalog" as const;
  if (
    /(product|produit|article|item|pump|valve|mixer|automation|series|type-series|lc\/)/.test(value)
  )
    return "product" as const;
  return "page" as const;
}

function discoveryPriority(type: string) {
  if (type === "product") return 0;
  if (type === "seed") return 1;
  if (type === "catalog") return 2;
  return 3;
}

function productDetailSignals(
  body: string,
  url: URL,
  resourceType: string,
) {
  const signals: string[] = [];
  if (/['"]@type['"]\s*:\s*['"]Product['"]/i.test(body))
    signals.push("schema_org_product");
  if (/<meta[^>]+property=["']og:type["'][^>]+content=["']product["']/i.test(body) ||
      /<meta[^>]+content=["']product["'][^>]+property=["']og:type["']/i.test(body))
    signals.push("open_graph_product");
  if (/(?:itemprop=["']price["']|product-price|product_price|woocommerce-Price-amount)/i.test(body))
    signals.push("product_price_markup");
  if (/(?:add-to-cart|ajouter au panier|buy now|acheter maintenant|加入购物车|立即购买)/i.test(body))
    signals.push("commerce_action");
  if (resourceType === "product" || classifyDiscoveredLink(url) === "product")
    signals.push("product_url");
  const looksLikeListing = /(?:\/category\/|\/categorie\/|\/catalog(?:ue)?\/|\/search\/|[?&](?:s|search|q|category)=)/i.test(
    `${url.pathname}${url.search}`,
  );
  if (looksLikeListing) signals.push("listing_url");
  return signals;
}

function isQualifiedProductDetail(signals: string[]) {
  if (signals.includes("listing_url")) return false;
  return signals.includes("schema_org_product") ||
    signals.includes("open_graph_product") ||
    (signals.includes("product_url") &&
      (signals.includes("product_price_markup") || signals.includes("commerce_action")));
}

function hierarchyLeaf(value: string) {
  const segments = value
    .split(/\s*(?:>|›|»|\/|\\)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.at(-1) || value.trim();
}

function extractAssignedJson(body: string, marker: string) {
  const markerIndex = body.indexOf(marker);
  if (markerIndex < 0) return null;
  const assignmentIndex = body.indexOf("=", markerIndex + marker.length);
  const startIndex = body.indexOf("{", assignmentIndex + 1);
  if (assignmentIndex < 0 || startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < body.length; index += 1) {
    const character = body[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) {
      try {
        return JSON.parse(body.slice(startIndex, index + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function discoverKsbDocuments(body: string, source: SourceRow) {
  if (text(source.config.brand).toUpperCase() !== "KSB")
    return [] as DiscoveredLink[];
  const states = [
    extractAssignedJson(body, "window.__QUERY_STATE__"),
    extractAssignedJson(body, "window.__PRELOADED_STATE__"),
  ].filter(Boolean);
  if (!states.length) return [] as DiscoveredLink[];

  const documents: Array<Json> = [];
  const visit = (value: unknown, depth = 0) => {
    if (depth > 16 || documents.length >= 500) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!value || typeof value !== "object") return;
    const row = value as Json;
    if (
      text(row.application).toUpperCase() === "PDF" &&
      text(row.checksum) &&
      text(row.documentNumber)
    )
      documents.push(row);
    for (const child of Object.values(row)) visit(child, depth + 1);
  };
  states.forEach((state) => visit(state));

  const languagePriority = (document: Json) => {
    const language = text(object(document.language).isocode).toLowerCase();
    if (language.startsWith("zh")) return 0;
    if (language === "en") return 1;
    return 2;
  };
  documents.sort(
    (left, right) => languagePriority(left) - languagePriority(right),
  );

  const salesOrg = text(source.config.pdfSalesOrg || "5101");
  const links = new Map<string, DiscoveredLink>();
  for (const document of documents) {
    const params = new URLSearchParams({
      application: "PDF",
      checksum: text(document.checksum),
      documentNumber: text(document.documentNumber),
      documentPart: text(document.documentPart),
      documentType: text(document.documentType),
      documentVersion: text(document.documentVersion),
      extension: text(document.fileExtension || "PDF"),
      mimetype: text(document.mimeType || "application/pdf"),
      salesOrg,
    });
    try {
      const url = validateSourceUrl(
        `https://live-commerce-proxy-e2e-sales.ksb.com/rest/v2/ksb/users/anonymous/odata/disfile?${params}`,
        source,
      );
      const language = object(document.language);
      links.set(url.toString(), {
        url: url.toString(),
        title: [
          text(document.name || document.description),
          text(language.nativeName || language.name),
          text(document.documentNumber),
        ]
          .filter(Boolean)
          .join(" · "),
        type: "pdf",
        metadata: {
          documentNumber: text(document.documentNumber),
          documentPart: text(document.documentPart),
          documentType: text(document.documentType),
          documentVersion: text(document.documentVersion),
          checksum: text(document.checksum),
          language: text(language.isocode),
          modifiedAt: text(document.modifiedtime),
          fileSize: number(document.fileSize),
          fileSizeUnit: text(document.fileSizeUnit),
        },
      });
    } catch {
      // Only official KSB document endpoints allowed by this source are retained.
    }
  }
  return Array.from(links.values());
}

function materialKeywordAliases(keyword: string) {
  const normalizedKeywords = keyword
    .split(/[、,，;；|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const groups = [
    ["水泥", "ciment", "cement"],
    ["钢筋", "fer a beton", "fer à béton", "rebar", "acier"],
    ["砂", "砂石", "sable", "gravier", "agregat", "agrégat"],
    ["砖", "brique", "bloc", "parpaing"],
    ["涂料", "peinture", "paint"],
    ["管材", "tuyau", "tube", "plomberie"],
    ["电料", "cable", "câble", "electricite", "électricité"],
  ];
  const aliases = new Set(normalizedKeywords);
  for (const normalized of normalizedKeywords) {
    for (const group of groups) {
      if (group.some((term) => normalized.includes(term) || term.includes(normalized))) {
        group.forEach((term) => aliases.add(term));
      }
    }
  }
  return Array.from(aliases);
}

function discoverLinks(body: string, currentUrl: URL, source: SourceRow, task: TaskRow) {
  const links = new Map<string, DiscoveredLink>();
  for (const match of body.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    try {
      const url = validateSourceUrl(
        new URL(decodeHtml(match[1]), currentUrl).toString(),
        source,
      );
      url.hash = "";
      const documentPath = `${url.pathname}${url.search}`;
      const documentFormat = /\.xlsx(?:$|[?#])/i.test(documentPath)
        ? "xlsx"
        : /\.xls(?:$|[?#])/i.test(documentPath)
          ? "xls"
          : "";
      const type = documentFormat ? "pdf" : classifyDiscoveredLink(url);
      if (
        task.target_type === "material" &&
        (url.searchParams.has("add-to-cart") ||
          url.searchParams.has("per_page") ||
          /\/page\/\d+\/?$/i.test(url.pathname))
      )
        continue;
      if (
        type === "page" &&
        !/(product|produit|catalog|catalogue|categorie|category|download|document|resource|pump|valve|ciment|cement|brique|bloc|sable|gravier|acier|设备|产品|水泥|砖|砂|钢)/i.test(
          `${url.pathname} ${match[2]}`,
        )
      )
        continue;
      const normalized = url.toString();
      if (!links.has(normalized))
        links.set(normalized, {
          url: normalized,
          title: stripHtml(match[2]).slice(0, 240),
          type,
          metadata: documentFormat ? { documentFormat } : undefined,
        });
      if (links.size >= 1000) break;
    } catch {
      // External, malformed and non-whitelisted links are intentionally ignored.
    }
  }
  for (const document of discoverKsbDocuments(body, source))
    links.set(document.url, document);
  const aliases = task.target_type === "material"
    ? materialKeywordAliases(task.keyword)
    : [task.keyword.toLowerCase()].filter(Boolean);
  const sorted = Array.from(links.values()).sort((left, right) => {
    const score = (link: DiscoveredLink) => {
      const searchable = decodeHtml(`${link.url} ${link.title}`).toLowerCase();
      return (link.type === "product" ? 100 : link.type === "catalog" ? 60 : 0) +
        (aliases.some((alias) => searchable.includes(alias)) ? 80 : 0);
    };
    return score(right) - score(left);
  });
  if (task.target_type !== "material") return sorted;
  return sorted.filter((link) => {
    if (link.type === "pdf") return true;
    const searchable = decodeHtml(`${link.url} ${link.title}`).toLowerCase();
    return aliases.some((alias) => searchable.includes(alias));
  });
}

function isCaidMonthlyPriceReport(link: DiscoveredLink) {
  let pathname = "";
  try {
    pathname = decodeURIComponent(new URL(link.url).pathname).toLowerCase();
  } catch {
    return false;
  }
  if (!pathname.includes("/lokole/")) return false;
  const searchable = `${pathname} ${link.title}`.toLowerCase();
  return /(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|sept(?:embre)?|octobre|novembre|decembre|décembre)[-_\s]*20\d{2}/i.test(searchable) ||
    /20\d{2}[-_\s]*(0?[1-9]|1[0-2])(?:\D|$)/.test(searchable);
}

function normalizeDocumentMatchText(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function matchDocumentsToCatalogCandidate(
  candidate: CatalogCandidate,
  pdfs: DiscoveredLink[],
  pageCandidateCount: number,
) {
  const strictGlobalDocumentIndex =
    candidate.brand.trim().toUpperCase() === "KSB";
  if (pageCandidateCount === 1 && !strictGlobalDocumentIndex)
    return pdfs.slice(0, 30);

  const exactKeys = [
    candidate.model,
    candidate.productSeries,
    candidate.metadata.rawProductName,
  ]
    .map(normalizeDocumentMatchText)
    .filter((value) => value.length >= 4);
  const equipmentName = normalizeDocumentMatchText(candidate.equipmentName);

  return pdfs
    .filter((pdf) => {
      const searchable = normalizeDocumentMatchText(
        [
          pdf.title,
          pdf.url,
          pdf.metadata?.documentNumber,
          pdf.metadata?.productName,
          pdf.metadata?.series,
          pdf.metadata?.model,
        ]
          .map(text)
          .join(" "),
      );
      if (!searchable) return false;
      if (exactKeys.some((key) => searchable.includes(key))) return true;
      return equipmentName.length >= 6 && searchable.includes(equipmentName);
    })
    .slice(0, 30);
}

function matchesTaskScope(
  body: string,
  url: URL,
  pageTitle: string,
  task: TaskRow,
) {
  if (task.target_type === "material") {
    const aliases = materialKeywordAliases(task.keyword);
    const searchable = decodeHtml(
      `${url.pathname} ${pageTitle} ${stripHtml(body).slice(0, 300_000)}`,
    ).toLowerCase();
    return aliases.some((alias) => searchable.includes(alias));
  }
  const keywords = Array.isArray(task.config.includeKeywords)
    ? task.config.includeKeywords
        .map((item) => text(item).toLowerCase())
        .filter(Boolean)
    : [];
  if (text(task.config.scopePreset) !== "water_treatment" || !keywords.length)
    return true;
  const searchable = decodeHtml(
    `${url.pathname} ${pageTitle} ${stripHtml(body).slice(0, 300_000)}`,
  ).toLowerCase();
  return keywords.some((keyword) => searchable.includes(keyword));
}

function classifyEquipmentCategory(value: string) {
  const source = value.toLowerCase();
  if (/(泵|pump)/i.test(source)) return "水泵设备";
  if (/(阀|valve)/i.test(source)) return "阀门设备";
  if (/(流量计|液位计|压力计|仪表|meter|sensor|instrument)/i.test(source))
    return "仪表设备";
  if (/(风机|鼓风机|blower|fan)/i.test(source)) return "风机设备";
  if (/(加药|投加|dosing|chemical feed)/i.test(source)) return "加药设备";
  if (/(格栅|screen)/i.test(source)) return "格栅设备";
  if (/(电机|变频|控制柜|配电|motor|drive|switchgear|control)/i.test(source))
    return "电气设备";
  if (/(搅拌|mixer|agitator)/i.test(source)) return "搅拌设备";
  if (/(过滤|滤池|filter)/i.test(source)) return "过滤设备";
  if (/(曝气|aeration)/i.test(source)) return "曝气设备";
  if (/(消毒|紫外|chlorine|uv)/i.test(source)) return "消毒设备";
  return "其他设备";
}

function jsonLdTypes(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => text(item).toLowerCase());
}

function findJsonLdProducts(value: unknown, output: Json[], depth = 0) {
  if (depth > 12 || output.length >= 100) return;
  if (Array.isArray(value)) {
    for (const item of value) findJsonLdProducts(item, output, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  const row = value as Json;
  if (
    jsonLdTypes(row["@type"]).some(
      (type) => type === "product" || type.endsWith("/product"),
    )
  )
    output.push(row);
  for (const child of Object.values(row))
    findJsonLdProducts(child, output, depth + 1);
}

function metaContent(body: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = body.match(
    new RegExp(
      `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
  );
  const second = body.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`,
      "i",
    ),
  );
  return decodeHtml(first?.[1] || second?.[1] || "").trim();
}

function metaProperty(body: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = body.match(
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
  );
  const second = body.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`,
      "i",
    ),
  );
  return decodeHtml(first?.[1] || second?.[1] || "").trim();
}

function normalizeCatalogImageUrl(value: unknown, currentUrl: URL) {
  const raw = decodeHtml(text(value))
    .trim()
    .replace(/^["']+|["']+$/g, "");
  if (!raw) return "";
  try {
    const url = new URL(raw, currentUrl);
    // KSB product JSON-LD may expose /medias paths on the public host even
    // though the media is served by the commerce proxy.
    if (url.hostname === "www.ksb.com" && url.pathname.startsWith("/medias/")) {
      url.hostname = "live-commerce-proxy-e2e-sales.ksb.com";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function additionalProperties(value: unknown) {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return rows.flatMap((item, index) => {
    const row = object(item);
    const name = text(row.name || row.propertyID || row.label);
    const rawValue = text(row.value || row.valueReference || row.description);
    if (!name || !rawValue) return [];
    const unit = text(row.unitText || row.unitCode);
    return [
      {
        code: `AUTO_${stableCode(name)}`,
        name,
        rawValue,
        normalizedValue: rawValue,
        unit,
        isKey: index < 8,
        confidence: 92,
      } satisfies CatalogParameterCandidate,
    ];
  });
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return decodeHtml(
      value.replace(/\\u([0-9a-f]{4})/gi, (_match, code) =>
        String.fromCharCode(Number.parseInt(code, 16)),
      ),
    )
      .replace(/\\[nrt]/g, " ")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .trim();
  }
}

function embeddedFeatureParameters(body: string) {
  const parameters: CatalogParameterCandidate[] = [];
  const featurePattern =
    /"featureValues"\s*:\s*\[([\s\S]*?)\]\s*,\s*"name"\s*:\s*"((?:\\.|[^"\\])+)"/g;
  for (const match of body.matchAll(featurePattern)) {
    const name = decodeJsonString(match[2]).replace(/\s+/g, " ").trim();
    const values = [...match[1].matchAll(/"value"\s*:\s*"((?:\\.|[^"\\])*)"/g)]
      .map((valueMatch) =>
        decodeJsonString(valueMatch[1]).replace(/\s+/g, " ").trim(),
      )
      .filter(Boolean);
    if (!name || !values.length) continue;

    const prefix = body.slice(
      Math.max(0, (match.index ?? 0) - 900),
      match.index ?? 0,
    );
    const featureStart = Math.max(
      prefix.lastIndexOf('{"code"'),
      prefix.lastIndexOf('{"featureUnit"'),
      prefix.lastIndexOf('{"featureValues"'),
    );
    const featurePrefix = featureStart >= 0 ? prefix.slice(featureStart) : "";
    const symbols = [
      ...featurePrefix.matchAll(/"symbol"\s*:\s*"((?:\\.|[^"\\])*)"/g),
    ];
    const unit = symbols.length
      ? decodeJsonString(symbols[symbols.length - 1][1])
      : "";
    const rawValue = [...new Set(values)].join(", ");
    const code = `WEB_${stableCode(name)}`;
    if (parameters.some((parameter) => parameter.code === code)) continue;
    parameters.push({
      code,
      name,
      rawValue,
      normalizedValue: rawValue,
      unit,
      isKey: parameters.length < 16,
      confidence: 90,
    });
    if (parameters.length >= 80) break;
  }
  return parameters;
}

function htmlTableParameters(body: string) {
  const parameters: CatalogParameterCandidate[] = [];
  for (const rowMatch of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
      .map((cell) => stripHtml(cell[1]))
      .filter(Boolean);
    if (cells.length < 2) continue;
    const name = cells[0].replace(/[：:]\s*$/, "").trim();
    const rawValue = cells.slice(1).join("；").trim();
    if (!name || !rawValue || name.length > 80 || rawValue.length > 1200) continue;
    const code = `TABLE_${stableCode(name)}`;
    if (parameters.some((parameter) => parameter.code === code)) continue;
    parameters.push({
      code,
      name,
      rawValue,
      normalizedValue: rawValue,
      unit: "",
      isKey: parameters.length < 16,
      confidence: 90,
    });
    if (parameters.length >= 80) break;
  }
  return parameters;
}

function mergeCatalogParameters(...groups: CatalogParameterCandidate[][]) {
  const result = new Map<string, CatalogParameterCandidate>();
  for (const parameter of groups.flat()) {
    const key = parameter.name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
    const current = result.get(key);
    if (!current || parameter.confidence > current.confidence)
      result.set(key, parameter);
  }
  return [...result.values()].map((parameter, index) => ({
    ...parameter,
    isKey: index < 16,
  }));
}

function extractCatalogCandidates(
  body: string,
  currentUrl: URL,
  pageTitle: string,
  source: SourceRow,
) {
  const products: Json[] = [];
  for (const match of body.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      findJsonLdProducts(JSON.parse(decodeHtml(match[1])), products);
    } catch {
      /* malformed JSON-LD remains evidence */
    }
  }
  const description = metaContent(body, "description");
  const pageFeatures = embeddedFeatureParameters(body);
  const candidates: CatalogCandidate[] = [];
  for (const product of products) {
    const brandObject = object(product.brand);
    const manufacturerObject = object(product.manufacturer);
    const brand = text(
      brandObject.name ||
        product.brand ||
        source.config.brand ||
        source.config.supplierName,
    );
    const rawName = hierarchyLeaf(text(product.name || pageTitle));
    const model = text(
      product.model || product.mpn || product.sku || product.productID,
    );
    const equipmentType =
      hierarchyLeaf(text(product.category)) ||
      rawName
        .replace(new RegExp(`^${brand}\\s*`, "i"), "")
        .replace(/\s*\([^)]*\)\s*$/, "");
    const seriesMatch = rawName.match(/\(([^)]+)\)/);
    const productSeries = text(
      product.productSeries ||
        seriesMatch?.[1] ||
        (model && rawName.includes(model) ? "" : model),
    );
    const equipmentName = equipmentType || rawName || productSeries;
    if (!equipmentName || (!model && !productSeries)) continue;
    const parameters = mergeCatalogParameters(
      additionalProperties(product.additionalProperty),
      pageFeatures,
      htmlTableParameters(body),
    );
    const specification = parameters
      .slice(0, 5)
      .map(
        (item) =>
          `${item.name} ${item.rawValue}${item.unit ? ` ${item.unit}` : ""}`,
      )
      .join("；");
    const technicalStandard =
      [rawName, description]
        .join(" ")
        .match(/\b(?:EN|ISO|DIN|GB|IEC)\s*[0-9][0-9A-Za-z .:/-]*/i)?.[0]
        ?.trim() || "";
    const imageValue = Array.isArray(product.image)
      ? product.image
      : product.image
        ? [product.image]
        : [];
    const imageUrls = [
      ...new Set(
        [...imageValue, metaProperty(body, "og:image")]
          .map((item) => normalizeCatalogImageUrl(item, currentUrl))
          .filter(Boolean),
      ),
    ];
    const populated = [
      equipmentName,
      equipmentType,
      brand,
      model,
      productSeries,
      specification,
      description,
      technicalStandard,
      parameters.length ? "parameters" : "",
    ].filter(Boolean).length;
    const completeness = Math.min(96, Math.round((populated / 9) * 100));
    const confidence = parameters.length ? 94 : 86;
    candidates.push({
      equipmentName,
      normalizedName: equipmentName.toLowerCase().replace(/\s+/g, " "),
      equipmentCategory: classifyEquipmentCategory(
        `${equipmentType} ${rawName} ${description}`,
      ),
      equipmentType,
      brand,
      manufacturer: text(
        manufacturerObject.name || product.manufacturer || brand,
      ),
      productSeries,
      model,
      specification,
      application: text(product.description || description),
      technicalStandard,
      countryCode: text(source.config.countryCode),
      language: currentUrl.pathname.startsWith("/zh-")
        ? "zh-CN"
        : text(source.config.language || "zh-CN"),
      datasheetUrl: null,
      catalogUrl: text(product.url)
        ? new URL(text(product.url), currentUrl).toString()
        : currentUrl.toString(),
      sourceUrl: currentUrl.toString(),
      confidence,
      completeness,
      riskLevel:
        completeness >= 80 && parameters.length
          ? "low"
          : completeness >= 60
            ? "medium"
            : "high",
      parameters,
      metadata: {
        extractionMethod: pageFeatures.length
          ? "schema_org_product+embedded_features"
          : "schema_org_product",
        extractionVersion: "catalog-v2",
        embeddedFeatureCount: pageFeatures.length,
        sourceName: source.name,
        imageUrls,
        rawProductName: rawName,
        requiresHumanReview: true,
        aiFinalDecision: false,
      },
    });
  }
  return candidates;
}

async function persistCatalogCandidate(
  admin: ReturnType<typeof createClient>,
  task: TaskRow,
  runId: string,
  source: SourceRow,
  discoveryId: string,
  candidate: CatalogCandidate,
  actorId: string,
  discoveredPdfs: DiscoveredLink[] = [],
) {
  let existingQuery = admin
    .from("wpi_equipment_catalog")
    .select("id,review_status,metadata,datasheet_url,parameter_completeness")
    .eq("organization_id", task.organization_id)
    .eq("normalized_name", candidate.normalizedName)
    .eq("brand", candidate.brand);
  existingQuery = candidate.model
    ? existingQuery.eq("model", candidate.model)
    : existingQuery.eq("product_series", candidate.productSeries);
  const existing = await existingQuery.limit(1).maybeSingle();
  if (existing.error) throw existing.error;

  const catalogPayload = {
    equipment_name: candidate.equipmentName,
    normalized_name: candidate.normalizedName,
    equipment_category: candidate.equipmentCategory,
    equipment_type: candidate.equipmentType,
    brand: candidate.brand,
    manufacturer: candidate.manufacturer,
    product_series: candidate.productSeries,
    model: candidate.model,
    specification: candidate.specification,
    application: candidate.application,
    technical_standard: candidate.technicalStandard,
    country_code: candidate.countryCode,
    language: candidate.language,
    datasheet_url:
      candidate.datasheetUrl || text(existing.data?.datasheet_url) || null,
    catalog_url: candidate.catalogUrl,
    source_url: candidate.sourceUrl,
    source_type: source.source_kind === "api" ? "api" : "website",
    ai_extracted: true,
    ai_confidence: candidate.confidence,
    risk_level: candidate.riskLevel,
    collection_task_id: task.id,
    collection_run_id: runId,
    source_discovery_id: discoveryId,
    extracted_at: new Date().toISOString(),
    updated_by: actorId,
  };

  let catalogId = text(existing.data?.id);
  let created = false;
  if (catalogId) {
    if (existing.data?.review_status !== "approved") {
      const updated = await admin
        .from("wpi_equipment_catalog")
        .update({
          ...catalogPayload,
          review_status: "pending_review",
          metadata: {
            ...object(existing.data?.metadata),
            ...candidate.metadata,
          },
        })
        .eq("id", catalogId)
        .select("id")
        .single();
      if (updated.error) throw updated.error;
    }
  } else {
    const inserted = await admin
      .from("wpi_equipment_catalog")
      .insert({
        organization_id: task.organization_id,
        catalog_code: `CAT-AI-${stableCode(`${candidate.brand}|${candidate.model}|${candidate.equipmentName}`)}`,
        ...catalogPayload,
        parameter_completeness: candidate.completeness,
        review_status: "pending_review",
        metadata: candidate.metadata,
        created_by: actorId,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data)
      throw inserted.error || new Error("设备候选写入失败");
    catalogId = inserted.data.id;
    created = true;
  }

  if (candidate.parameters.length) {
    const parameterRows = candidate.parameters.map((parameter) => ({
      organization_id: task.organization_id,
      equipment_catalog_id: catalogId,
      parameter_code: parameter.code,
      parameter_name: parameter.name,
      raw_value: parameter.rawValue,
      normalized_value: parameter.normalizedValue,
      data_type: "text",
      unit: parameter.unit,
      is_key: parameter.isKey,
      source_evidence: {
        discoveryId,
        sourceUrl: candidate.sourceUrl,
        extractionMethod:
          text(candidate.metadata.extractionMethod) || "schema_org_product",
        capturedAt: new Date().toISOString(),
      },
      confidence: parameter.confidence,
      review_status: "pending_review",
      created_by: actorId,
      updated_by: actorId,
    }));
    const parameters = await admin
      .from("wpi_equipment_catalog_parameters")
      .upsert(parameterRows, {
        onConflict: "equipment_catalog_id,parameter_code",
      });
    if (parameters.error) throw parameters.error;
  }

  const sourceExisting = await admin
    .from("wpi_equipment_catalog_sources")
    .select("id")
    .eq("equipment_catalog_id", catalogId)
    .eq("discovery_id", discoveryId)
    .maybeSingle();
  if (sourceExisting.error) throw sourceExisting.error;
  const sourcePayload = {
    organization_id: task.organization_id,
    equipment_catalog_id: catalogId,
    source_type: source.source_kind === "api" ? "api" : "website",
    source_title: `${candidate.brand || source.name} · ${candidate.productSeries || candidate.model || candidate.equipmentName}`,
    source_url: candidate.sourceUrl,
    language: candidate.language,
    checked_at: new Date().toISOString(),
    confidence: candidate.confidence,
    review_status: "pending_review",
    collection_task_id: task.id,
    collection_run_id: runId,
    discovery_id: discoveryId,
    metadata: {
      extractionMethod:
        text(candidate.metadata.extractionMethod) || "schema_org_product",
      extractionVersion:
        text(candidate.metadata.extractionVersion) || "catalog-v2",
      requiresHumanReview: true,
    },
    updated_by: actorId,
  };
  const sourceWrite = sourceExisting.data
    ? await admin
        .from("wpi_equipment_catalog_sources")
        .update(sourcePayload)
        .eq("id", sourceExisting.data.id)
    : await admin
        .from("wpi_equipment_catalog_sources")
        .insert({ ...sourcePayload, created_by: actorId });
  if (sourceWrite.error) throw sourceWrite.error;

  const pdfs = Array.from(
    new Map(
      discoveredPdfs
        .filter((item) => item.type === "pdf" && /^https:\/\//i.test(item.url))
        .map((item) => [item.url, item]),
    ).values(),
  ).slice(0, 30);
  let primaryPdfSourceId = "";
  for (const [index, pdf] of pdfs.entries()) {
    const existingPdf = await admin
      .from("wpi_equipment_catalog_sources")
      .select("id")
      .eq("organization_id", task.organization_id)
      .eq("equipment_catalog_id", catalogId)
      .eq("source_url", pdf.url)
      .maybeSingle();
    if (existingPdf.error) throw existingPdf.error;
    let pdfSourceId = text(existingPdf.data?.id);
    if (!pdfSourceId) {
      const insertedPdf = await admin
        .from("wpi_equipment_catalog_sources")
        .insert({
          organization_id: task.organization_id,
          equipment_catalog_id: catalogId,
          source_type: "pdf",
          source_title:
            pdf.title || `${candidate.brand || source.name} 官方技术文档`,
          source_url: pdf.url,
          language: text(pdf.metadata?.language) || candidate.language,
          checked_at: new Date().toISOString(),
          confidence: 92,
          review_status: "pending_review",
          collection_task_id: task.id,
          collection_run_id: runId,
          metadata: {
            ...(pdf.metadata || {}),
            autoDiscovered: true,
            parentUrl: candidate.sourceUrl,
            requiresHumanReview: true,
          },
          created_by: actorId,
          updated_by: actorId,
        })
        .select("id")
        .single();
      if (insertedPdf.error || !insertedPdf.data)
        throw insertedPdf.error || new Error("PDF来源归档失败");
      pdfSourceId = insertedPdf.data.id;
    }
    if (index === 0) primaryPdfSourceId = pdfSourceId;
  }

  const primaryPdf = pdfs[0];
  if (primaryPdf) {
    const catalogDocumentUpdate = await admin
      .from("wpi_equipment_catalog")
      .update({
        datasheet_url: primaryPdf.url,
        review_status: "pending_review",
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", catalogId)
      .eq("organization_id", task.organization_id);
    if (catalogDocumentUpdate.error) throw catalogDocumentUpdate.error;

    const existingJob = await admin
      .from("wpi_equipment_catalog_document_jobs")
      .select("id,status")
      .eq("organization_id", task.organization_id)
      .eq("equipment_catalog_id", catalogId)
      .eq("document_url", primaryPdf.url)
      .in("status", ["queued", "running", "needs_review", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingJob.error) throw existingJob.error;
    if (!existingJob.data) {
      const fileName = decodeURIComponent(
        new URL(primaryPdf.url).pathname.split("/").pop() ||
          `${candidate.model || candidate.equipmentName}.pdf`,
      ).slice(0, 300);
      const queuedJob = await admin
        .from("wpi_equipment_catalog_document_jobs")
        .insert({
          organization_id: task.organization_id,
          equipment_catalog_id: catalogId,
          source_id: primaryPdfSourceId || null,
          document_url: primaryPdf.url,
          file_name: fileName,
          mime_type: "application/pdf",
          status: "queued",
          progress: 0,
          requested_by: actorId,
          metadata: {
            autoQueued: true,
            collectionTaskId: task.id,
            collectionRunId: runId,
            requiresHumanReview: true,
          },
        });
      if (queuedJob.error) throw queuedJob.error;
    }
  }

  const discovery = await admin
    .from("wpi_equipment_collection_discoveries")
    .select("metadata")
    .eq("id", discoveryId)
    .single();
  if (!discovery.error) {
    await admin
      .from("wpi_equipment_collection_discoveries")
      .update({
        metadata: {
          ...object(discovery.data?.metadata),
          equipmentCatalogId: catalogId,
          structuredStatus: "pending_review",
          structuredAt: new Date().toISOString(),
        },
        updated_by: actorId,
      })
      .eq("id", discoveryId);
  }
  return { catalogId, created };
}

async function persistCatalogTechnicalParameters(
  admin: ReturnType<typeof createClient>,
  task: TaskRow,
  runId: string,
  discoveryId: string,
  productUrl: string,
  technicalUrl: string,
  parameters: CatalogParameterCandidate[],
  actorId: string,
) {
  if (!productUrl || !parameters.length) return false;
  let catalog = await admin
    .from("wpi_equipment_catalog")
    .select("id,parameter_completeness,metadata")
    .eq("organization_id", task.organization_id)
    .eq("source_url", productUrl)
    .limit(1)
    .maybeSingle();
  if (!catalog.data && !catalog.error) {
    catalog = await admin
      .from("wpi_equipment_catalog")
      .select("id,parameter_completeness,metadata")
      .eq("organization_id", task.organization_id)
      .eq("catalog_url", productUrl)
      .limit(1)
      .maybeSingle();
  }
  if (catalog.error || !catalog.data) return false;

  const parameterRows = parameters.map((parameter) => ({
    organization_id: task.organization_id,
    equipment_catalog_id: catalog.data.id,
    parameter_code: parameter.code,
    parameter_name: parameter.name,
    raw_value: parameter.rawValue,
    normalized_value: parameter.normalizedValue,
    data_type: "text",
    unit: parameter.unit,
    is_key: parameter.isKey,
    source_evidence: {
      discoveryId,
      sourceUrl: technicalUrl,
      parentProductUrl: productUrl,
      extractionMethod: "html_technical_table",
      capturedAt: new Date().toISOString(),
    },
    confidence: parameter.confidence,
    review_status: "pending_review",
    created_by: actorId,
    updated_by: actorId,
  }));
  const persisted = await admin
    .from("wpi_equipment_catalog_parameters")
    .upsert(parameterRows, { onConflict: "equipment_catalog_id,parameter_code" });
  if (persisted.error) throw persisted.error;

  const completeness = Math.min(
    96,
    Math.max(number(catalog.data.parameter_completeness), 56 + Math.min(32, parameters.length * 2)),
  );
  const updated = await admin
    .from("wpi_equipment_catalog")
    .update({
      parameter_completeness: completeness,
      collection_run_id: runId,
      metadata: {
        ...object(catalog.data.metadata),
        technicalParameterSource: technicalUrl,
        technicalParameterCount: parameters.length,
        technicalParametersCapturedAt: new Date().toISOString(),
      },
      updated_by: actorId,
    })
    .eq("id", catalog.data.id);
  if (updated.error) throw updated.error;
  return true;
}

async function persistCatalogDocumentsForParent(
  admin: ReturnType<typeof createClient>,
  task: TaskRow,
  runId: string,
  source: SourceRow,
  productUrl: string,
  documents: DiscoveredLink[],
  actorId: string,
) {
  if (!productUrl || !documents.length) return 0;
  let catalog = await admin
    .from("wpi_equipment_catalog")
    .select("id,metadata")
    .eq("organization_id", task.organization_id)
    .eq("source_url", productUrl)
    .limit(1)
    .maybeSingle();
  if (!catalog.data && !catalog.error) {
    catalog = await admin
      .from("wpi_equipment_catalog")
      .select("id,metadata")
      .eq("organization_id", task.organization_id)
      .eq("catalog_url", productUrl)
      .limit(1)
      .maybeSingle();
  }
  if (catalog.error || !catalog.data) return 0;

  const uniqueDocuments = Array.from(
    new Map(
      documents
        .filter((document) => document.type === "pdf" && /^https:\/\//i.test(document.url))
        .map((document) => [document.url, document]),
    ).values(),
  ).slice(0, 30);
  let queuedCount = 0;
  for (const document of uniqueDocuments) {
    const existingSource = await admin
      .from("wpi_equipment_catalog_sources")
      .select("id")
      .eq("organization_id", task.organization_id)
      .eq("equipment_catalog_id", catalog.data.id)
      .eq("source_url", document.url)
      .maybeSingle();
    if (existingSource.error) throw existingSource.error;
    let documentSourceId = text(existingSource.data?.id);
    if (!documentSourceId) {
      const insertedSource = await admin
        .from("wpi_equipment_catalog_sources")
        .insert({
          organization_id: task.organization_id,
          equipment_catalog_id: catalog.data.id,
          source_type: "pdf",
          source_title: document.title || `${source.name} 官方技术文档`,
          source_url: document.url,
          language: text(document.metadata?.language) || "zh-CN",
          checked_at: new Date().toISOString(),
          confidence: 92,
          review_status: "pending_review",
          collection_task_id: task.id,
          collection_run_id: runId,
          metadata: {
            ...(document.metadata || {}),
            autoDiscovered: true,
            parentUrl: productUrl,
            requiresHumanReview: true,
          },
          created_by: actorId,
          updated_by: actorId,
        })
        .select("id")
        .single();
      if (insertedSource.error || !insertedSource.data)
        throw insertedSource.error || new Error("PDF来源归档失败");
      documentSourceId = insertedSource.data.id;
    }

    const existingJob = await admin
      .from("wpi_equipment_catalog_document_jobs")
      .select("id")
      .eq("organization_id", task.organization_id)
      .eq("equipment_catalog_id", catalog.data.id)
      .eq("document_url", document.url)
      .in("status", ["queued", "running", "needs_review", "completed"])
      .limit(1)
      .maybeSingle();
    if (existingJob.error) throw existingJob.error;
    if (!existingJob.data) {
      const pathName = decodeURIComponent(new URL(document.url).pathname.split("/").pop() || "document");
      const fileName = /\.[a-z0-9]{2,5}$/i.test(pathName) ? pathName : `${pathName}.pdf`;
      const queuedJob = await admin
        .from("wpi_equipment_catalog_document_jobs")
        .insert({
          organization_id: task.organization_id,
          equipment_catalog_id: catalog.data.id,
          source_id: documentSourceId || null,
          document_url: document.url,
          file_name: fileName.slice(0, 300),
          mime_type: "application/pdf",
          status: "queued",
          progress: 0,
          requested_by: actorId,
          metadata: {
            autoQueued: true,
            collectionTaskId: task.id,
            collectionRunId: runId,
            parentProductUrl: productUrl,
            requiresHumanReview: true,
          },
        });
      if (queuedJob.error) throw queuedJob.error;
      queuedCount += 1;
    }
  }

  if (uniqueDocuments[0]) {
    const updated = await admin
      .from("wpi_equipment_catalog")
      .update({
        datasheet_url: uniqueDocuments[0].url,
        metadata: {
          ...object(catalog.data.metadata),
          discoveredDocumentCount: uniqueDocuments.length,
          documentsCapturedAt: new Date().toISOString(),
        },
        updated_by: actorId,
      })
      .eq("id", catalog.data.id);
    if (updated.error) throw updated.error;
  }
  return queuedCount;
}

function candidateValidation(
  name: string,
  specification: string,
  unit: string,
  currency: string,
  region: string,
  priceContext: string,
  productDetail: boolean,
) {
  const reasons: string[] = [];
  if (!name) reasons.push("missing_product_name");
  if (!specification) reasons.push("missing_specification");
  if (!unit) reasons.push("missing_unit");
  if (!currency || !["CNY", "USD", "EUR", "CDF"].includes(currency.toUpperCase()))
    reasons.push("unsupported_currency");
  if (!region) reasons.push("missing_region");
  if (!priceContext) reasons.push("missing_price_context");
  if (!productDetail) reasons.push("non_product_detail_page");
  return {
    validationStatus: reasons.length ? "needs_review" as const : "valid" as const,
    validationReasons: reasons,
  };
}

function applyPriceAgeRule(candidate: Candidate, task: TaskRow) {
  if (!candidate.quoteDate || candidate.validationStatus === "invalid") return candidate;
  const quoteTime = Date.parse(candidate.quoteDate);
  if (!Number.isFinite(quoteTime)) return candidate;
  const maxPriceAgeDays = Math.max(1, Math.min(365, number(task.config.maxPriceAgeDays) || 90));
  const ageDays = Math.max(0, Math.floor((Date.now() - quoteTime) / 86_400_000));
  if (ageDays <= maxPriceAgeDays) return candidate;
  candidate.validationStatus = "needs_review";
  candidate.validationReasons = Array.from(new Set([
    ...candidate.validationReasons,
    `stale_price_date:${ageDays}d>${maxPriceAgeDays}d`,
  ]));
  return candidate;
}

function normalizeMonthlyQuoteDate(value: unknown) {
  const raw = text(value);
  const direct = raw.match(/^(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (direct) return `${direct[1]}-${direct[2]}-01`;
  const namedMonths: Record<string, string> = {
    janvier: "01", fevrier: "02", février: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", aout: "08", août: "08",
    sept: "09", septembre: "09", octobre: "10", novembre: "11", decembre: "12", décembre: "12",
  };
  const normalized = raw.toLowerCase();
  const year = normalized.match(/20\d{2}/)?.[0];
  const month = Object.entries(namedMonths).find(([name]) => normalized.includes(name))?.[1];
  return year && month ? `${year}-${month}-01` : "";
}

async function processCaidPriceReport(args: {
  admin: ReturnType<typeof createClient>;
  supabaseUrl: string;
  serviceRoleKey: string;
  task: TaskRow;
  runId: string;
  source: SourceRow;
  discoveryId: string;
  documentUrl: string;
  documentTitle: string;
  mimeType: string;
  actorId: string;
}) {
  const {
    admin, supabaseUrl, serviceRoleKey, task, runId, source, discoveryId,
    documentUrl, documentTitle, mimeType, actorId,
  } = args;
  const pathName = decodeURIComponent(new URL(documentUrl).pathname.split("/").pop() || "caid-report.pdf");
  const fileName = (documentTitle || pathName).slice(0, 300);
  await admin.from("wpi_equipment_collection_discoveries").update({
    run_id: runId,
    status: "fetching",
    error_message: null,
    updated_by: actorId,
    metadata: {
      parseStatus: "parsing",
      parser: "caid-price-report-v1",
      parseStartedAt: new Date().toISOString(),
      requiresHumanReview: true,
    },
  }).eq("id", discoveryId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 135_000);
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/wpi-ai-gateway`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "recognize_caid_price_report",
        organizationId: task.organization_id,
        requestedBy: actorId,
        taskId: task.id,
        businessObjectId: discoveryId,
        sourceUrl: documentUrl,
        fileName,
        mimeType,
        input: {
          keyword: task.keyword,
          specification: task.specification,
          region: task.region || source.default_region,
          currency: task.currency || source.default_currency,
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const payload = object(await response.json().catch(() => ({})));
  if (!response.ok) {
    throw new Error(
      text(payload.detail) || text(payload.error) || `CAID 文档解析 HTTP ${response.status}`,
    );
  }
  const output = object(payload.data);
  const document = object(output.document);
  const items = Array.isArray(output.items)
    ? output.items.filter((item): item is Json => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const documentQuoteDate = normalizeMonthlyQuoteDate(document.quoteDate || document.reportPeriod || fileName);
  const leadIds: string[] = [];
  let created = 0;
  let updated = 0;
  let duplicates = 0;
  let rejected = 0;
  let filteredByPricePeriod = 0;
  let unknownPriceDate = 0;

  for (const item of items) {
    const price = number(item.unitPrice || item.price);
    const name = text(item.itemName || item.name);
    if (!name || price <= 0) {
      rejected += 1;
      continue;
    }
    const sourceEvidence = object(item.source);
    const missingFields = Array.isArray(item.missingFields)
      ? item.missingFields.filter((entry): entry is string => typeof entry === "string")
      : [];
    const confidence = Math.max(0, Math.min(100, number(item.confidence || output.overallConfidence)));
    const quoteDate = normalizeMonthlyQuoteDate(item.quoteDate) || documentQuoteDate;
    const candidate: Candidate = applyPriceAgeRule({
      targetType: "material",
      name,
      specification: text(item.specification || task.specification),
      price,
      currency: text(item.currency || document.currency || source.default_currency || task.currency).toUpperCase(),
      unit: text(item.unit),
      supplierName: text(item.supplierName || document.supplierName) || "CAID LOKOLE",
      region: text(item.region || task.region || source.default_region),
      sourceType: source.name,
      matchTarget: `地材价格库 / ${task.keyword}`,
      matchScore: confidence,
      sourceQuality: source.quality_score,
      validationStatus: "needs_review",
      validationReasons: Array.from(new Set([
        "ai_document_extraction",
        "human_review_required",
        ...missingFields.map((field) => `missing_${field}`),
      ])),
      originalPriceText: `${text(item.currency || document.currency || source.default_currency)} ${price}${text(item.unit) ? ` / ${text(item.unit)}` : ""}`,
      quoteDate,
      priceContext: text(sourceEvidence.text) || `${name} · ${text(item.specification)} · ${price}`,
      extractionMethod: "page_text",
      pageKind: "product_detail",
      detailSignals: ["caid_monthly_report", `page:${Math.max(1, number(sourceEvidence.pageNumber) || 1)}`],
    }, task);
    const periodDecision = candidatePricePeriodDecision(candidate, task);
    if (periodDecision !== "accepted") {
      rejected += 1;
      filteredByPricePeriod += 1;
      if (periodDecision === "unknown_date") unknownPriceDate += 1;
      continue;
    }
    const ingest = await admin.rpc("wpi_ingest_price_collection_candidate", {
      target_task_id: task.id,
      target_run_id: runId,
      target_source_id: source.id,
      candidate,
      evidence: {
        sourceUrl: documentUrl,
        canonicalUrl: documentUrl,
        pageTitle: documentTitle || fileName,
        excerpt: candidate.priceContext,
        httpStatus: 200,
        mimeType,
        metadata: {
          extractionStrategy: "ai_document_table",
          extractionMethod: candidate.extractionMethod,
          parser: "caid-price-report-v1",
          gatewayRunId: text(payload.gatewayRunId),
          requestId: text(payload.requestId),
          pageNumber: Math.max(1, number(sourceEvidence.pageNumber) || 1),
          evidenceConfidence: number(sourceEvidence.confidence),
          bbox: object(sourceEvidence.bbox),
          quoteDate: quoteDate || null,
          pricePeriodGranularity: "month",
          validationReasons: candidate.validationReasons,
          requiresHumanReview: true,
        },
      },
    });
    if (ingest.error) throw ingest.error;
    const leadId = text(ingest.data?.leadId);
    if (leadId) {
      leadIds.push(leadId);
      const leadUpdate = await admin.from("wpi_price_collection_leads").update({
        quote_date: quoteDate || null,
        price_period_granularity: "month",
      }).eq("id", leadId);
      if (leadUpdate.error) throw leadUpdate.error;
      const knownTranslation = knownMaterialTranslation(candidate);
      if (knownTranslation) {
        const translationUpdate = await admin.from("wpi_price_collection_leads")
          .update(knownTranslation).eq("id", leadId);
        if (translationUpdate.error) throw translationUpdate.error;
      }
    }
    if (ingest.data?.created) created += 1;
    else updated += 1;
    if (ingest.data?.duplicate) duplicates += 1;
  }

  if (!leadIds.length && filteredByPricePeriod === 0) {
    throw new Error("CAID 月报中未识别到符合当前品类且带价格的记录");
  }
  await admin.from("wpi_equipment_collection_discoveries").update({
    run_id: runId,
    status: "fetched",
    fetched_at: new Date().toISOString(),
    error_message: null,
    updated_by: actorId,
    metadata: {
      parseStatus: "parsed",
      parser: "caid-price-report-v1",
      parsedAt: new Date().toISOString(),
      gatewayRunId: text(payload.gatewayRunId),
      requestId: text(payload.requestId),
      reportPeriod: documentQuoteDate ? documentQuoteDate.slice(0, 7) : null,
      parsedItemCount: items.length,
      leadCount: leadIds.length,
      rejectedItemCount: rejected,
      filteredByPricePeriodCount: filteredByPricePeriod,
      unknownPriceDateCount: unknownPriceDate,
      requiresHumanReview: true,
    },
  }).eq("id", discoveryId);
  return { created, updated, duplicates, leadIds, filteredByPricePeriod, unknownPriceDate };
}

function currencyFromPriceText(value: string, fallback: string) {
  if (/CDF|\bFC\b/i.test(value)) return "CDF";
  if (/EUR|€/i.test(value)) return "EUR";
  if (/CNY|RMB|¥|￥/i.test(value)) return "CNY";
  if (/USD|US\$|\$/i.test(value)) return "USD";
  return fallback.toUpperCase();
}

function unitFromPriceContext(value: string) {
  const aliases: Array<[RegExp, string]> = [
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:袋|包|sac|bag)s?/i, "袋"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:吨|tonne|ton)s?/i, "吨"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:千克|公斤|kg)/i, "kg"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:平方米|平米|m2|m²|sqm)/i, "m²"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:立方米|m3|m³|cbm)/i, "m³"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:米|mètre|metre|meter)s?/i, "m"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:升|litre|liter|l)/i, "L"],
    [/(?:\/|每|per\s+|par\s+|pour\s+)(?:一)?\s*(?:台|套|件|个|只|支|piece|pièce|unit|unité)s?/i, "件"],
    [/(?:prix|price|售价|价格)[^\n]{0,36}?(?:par|per|每)\s*(?:袋|包|sac|bag)s?/i, "袋"],
    [/(?:prix|price|售价|价格)[^\n]{0,36}?(?:par|per|每)\s*(?:吨|tonne|ton)s?/i, "吨"],
  ];
  for (const [pattern, unit] of aliases) {
    if (pattern.test(value)) return unit;
  }
  return "";
}

function findJsonCandidates(
  value: unknown,
  task: TaskRow,
  source: SourceRow,
  output: Candidate[],
  detailSignals: string[] = ["structured_product"],
  depth = 0,
) {
  if (depth > 8 || output.length >= 50) return;
  if (Array.isArray(value)) {
    for (const item of value)
      findJsonCandidates(item, task, source, output, detailSignals, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  const row = value as Json;
  const offer = Array.isArray(row.offers)
    ? object(row.offers[0])
    : object(row.offers);
  const priceSpecification = object(offer.priceSpecification);
  const name = text(row.name || row.title || row.productName || row.itemName);
  const price = number(
    row.price ?? row.unitPrice ?? row.salePrice ?? offer.price ?? priceSpecification.price,
  );
  if (name && price > 0) {
    const specification = text(
      row.specification ||
        row.spec ||
        row.model ||
        row.sku ||
        task.specification,
    );
    const currency = text(
      row.priceCurrency ||
        row.currency ||
        offer.priceCurrency ||
        priceSpecification.priceCurrency ||
        source.default_currency ||
        task.currency,
    ).toUpperCase();
    const unit = text(
      row.unit ||
        row.unitText ||
        row.priceUnit ||
        priceSpecification.unitText ||
        priceSpecification.referenceQuantity,
    );
    const originalPriceText = `${currency} ${price}${unit ? ` / ${unit}` : ""}`;
    const rawQuoteDate = text(
      row.quoteDate || row.observationPeriod || row.priceDate || row.validFrom,
    );
    const quoteDate = /^\d{4}-\d{2}$/.test(rawQuoteDate)
      ? `${rawQuoteDate}-01`
      : /^\d{4}-\d{2}-\d{2}$/.test(rawQuoteDate)
        ? rawQuoteDate
        : "";
    const priceContext = [name, specification, originalPriceText]
      .filter(Boolean)
      .join(" · ");
    const region = text(row.region || source.default_region || task.region);
    const validation = candidateValidation(
      name,
      specification,
      unit,
      currency,
      region,
      priceContext,
      true,
    );
    output.push({
      targetType: task.target_type,
      name,
      specification,
      price,
      currency,
      unit,
      supplierName: text(
        object(row.seller).name || row.supplierName || row.brand,
      ),
      region,
      sourceType: source.name,
      matchTarget: `${task.target_type === "material" ? "地材" : "设备"}价格库 / ${task.keyword}`,
      matchScore: name.toLowerCase().includes(task.keyword.toLowerCase())
        ? 95
        : 75,
      sourceQuality: source.quality_score,
      ...validation,
      originalPriceText,
      quoteDate,
      priceContext,
      extractionMethod: "structured_data",
      pageKind: "product_detail",
      detailSignals,
    });
  }
  for (const child of Object.values(row))
    findJsonCandidates(child, task, source, output, detailSignals, depth + 1);
}

function extractCandidates(
  body: string,
  contentType: string,
  task: TaskRow,
  source: SourceRow,
  pageUrl: URL,
  resourceType: string,
) {
  const candidates: Candidate[] = [];
  const detailSignals = productDetailSignals(body, pageUrl, resourceType);
  if (contentType.includes("application/json")) {
    try {
      findJsonCandidates(JSON.parse(body), task, source, candidates, ["api_product_record"]);
    } catch {
      /* evidence still persists */
    }
    return candidates;
  }
  for (const match of body.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const products: Json[] = [];
      findJsonLdProducts(JSON.parse(match[1]), products);
      for (const product of products)
        findJsonCandidates(product, task, source, candidates, ["schema_org_product"]);
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  if (candidates.length) return candidates;
  if (!isQualifiedProductDetail(detailSignals)) return candidates;
  const plain = stripHtml(body);
  const amount =
    "([0-9]{1,3}(?:[\\u00a0 ]?[0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)";
  const pricePatterns = [
    new RegExp(`(?:¥|￥|CNY|RMB|USD|US\\$|\\$|CDF|FC|EUR|€)\\s*${amount}`, "gi"),
    new RegExp(`${amount}\\s*(?:USD|US\\$|\\$|CDF|FC|EUR|€)`, "gi"),
    /([0-9][0-9,]*(?:\.[0-9]{1,4})?)\s*(?:元\s*[/／]\s*(?:台|套|件|吨|米|m)|元\/吨)/gi,
  ];
  const aliases = task.target_type === "material"
    ? materialKeywordAliases(task.keyword)
    : [task.keyword.toLowerCase()].filter(Boolean);
  const title = decodeHtml(
    body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  )
    .replace(/\s+/g, " ")
    .trim();
  let priceMatch: RegExpMatchArray | undefined;
  let matchedContext = "";
  const rejectedCandidates: Candidate[] = [];
  const seenMatches = new Set<string>();
  findPrice: for (const pattern of pricePatterns) {
    for (const match of plain.matchAll(pattern)) {
      if (localizedPrice(match[1]) <= 0 || match.index === undefined) continue;
      const matchKey = `${match.index}:${match[0]}`;
      if (seenMatches.has(matchKey)) continue;
      seenMatches.add(matchKey);
      const nearby = plain
        .slice(Math.max(0, match.index - 180), match.index + match[0].length + 180)
        .toLowerCase();
      const immediateContext = plain
        .slice(Math.max(0, match.index - 120), match.index + match[0].length + 120)
        .replace(/\s+/g, " ")
        .trim();
      const lowerContext = immediateContext.toLowerCase();
      const invalidReason =
        /(livraison gratuite|free shipping|shipping threshold|frais de port|seuil de livraison|起送|满.*包邮|配送门槛)/i.test(lowerContext)
          ? "shipping_threshold_not_product_price"
          : /(minimum order|commande minimum|montant minimum|minimum d'achat|最低起订|起订金额)/i.test(lowerContext)
            ? "minimum_order_amount"
            : /(tél(?:éphone)?|telephone|phone|whatsapp|联系电话|客服电话)/i.test(lowerContext)
              ? "contact_number"
              : aliases.length && !aliases.some((alias) => nearby.includes(alias))
                ? "missing_keyword_near_price"
                : "";
      if (invalidReason) {
        if (rejectedCandidates.length < 5) {
          const currency = currencyFromPriceText(
            match[0],
            source.default_currency || task.currency || "CNY",
          );
          rejectedCandidates.push({
            targetType: task.target_type,
            name: title || task.keyword || "未识别商品数字",
            specification: task.specification || "",
            price: localizedPrice(match[1]),
            currency,
            unit: text(source.config.defaultUnit) || unitFromPriceContext(immediateContext),
            supplierName: text(source.config.supplierName),
            region: source.default_region || task.region || "",
            sourceType: source.name,
            matchTarget: `${task.target_type === "material" ? "地材" : "设备"}价格库 / ${task.keyword}`,
            matchScore: 0,
            sourceQuality: source.quality_score,
            validationStatus: "invalid",
            validationReasons: [invalidReason],
            originalPriceText: match[0].trim(),
            priceContext: immediateContext,
            extractionMethod: "page_text",
            pageKind: "product_detail",
            detailSignals,
          });
        }
        continue;
      }
      priceMatch = match;
      matchedContext = immediateContext;
      break findPrice;
    }
  }
  if (!priceMatch) return rejectedCandidates;
  const matchedCurrency = priceMatch[0];
  const currency = currencyFromPriceText(
    matchedCurrency,
    source.default_currency || task.currency || "CNY",
  );
  const specification = task.specification || "";
  const unit = text(source.config.defaultUnit) || unitFromPriceContext(matchedContext);
  const region = source.default_region || task.region || "";
  const validation = candidateValidation(
    title || task.keyword || "待人工确认采集对象",
    specification,
    unit,
    currency,
    region,
    matchedContext,
    true,
  );
  candidates.push({
    targetType: task.target_type,
    name: title || task.keyword || "待人工确认采集对象",
    specification,
    price: localizedPrice(priceMatch[1]),
    currency: currency.toUpperCase(),
    unit,
    supplierName: text(source.config.supplierName),
    region,
    sourceType: source.name,
    matchTarget: `${task.target_type === "material" ? "地材" : "设备"}价格库 / ${task.keyword}`,
    matchScore: 70,
    sourceQuality: source.quality_score,
    ...validation,
    originalPriceText: priceMatch[0].trim(),
    priceContext: matchedContext,
    extractionMethod: "page_text",
    pageKind: "product_detail",
    detailSignals,
  });
  return candidates;
}

function sourceUrls(task: TaskRow, source: SourceRow) {
  const config = object(task.config);
  const sourceMap = object(config.sourceUrls);
  const configured = sourceMap[source.id];
  const urls = Array.isArray(configured)
    ? configured.filter((item): item is string => typeof item === "string")
    : [];
  if (urls.length) return urls.slice(0, 10);
  return [source.base_url];
}

async function refreshCurrencyRates(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
) {
  for (const baseCurrency of ["USD", "EUR", "CDF"] as const) {
    try {
      const latestRate = await admin
        .from("wpi_currency_rates")
        .select("effective_at")
        .eq("organization_id", organizationId)
        .eq("base_currency", baseCurrency)
        .eq("quote_currency", "CNY")
        .order("effective_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latestEffectiveAt = Date.parse(text(latestRate.data?.effective_at));
      if (
        !latestRate.error &&
        Number.isFinite(latestEffectiveAt) &&
        latestEffectiveAt >= Date.now() - 20 * 60 * 60 * 1000
      ) continue;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const response = await fetch(baseCurrency === "CDF"
        ? "https://open.er-api.com/v6/latest/CDF"
        : `https://api.frankfurter.app/latest?from=${baseCurrency}&to=CNY`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).finally(() => clearTimeout(timeout));
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        result?: string;
        date?: string;
        rates?: Record<string, number>;
        time_last_update_unix?: number;
      };
      if (baseCurrency === "CDF" && payload.result !== "success") continue;
      const rate = Number(payload.rates?.CNY || 0);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const providerTimestamp = Number(payload.time_last_update_unix || 0);
      await admin.from("wpi_currency_rates").upsert(
        {
          organization_id: organizationId,
          base_currency: baseCurrency,
          quote_currency: "CNY",
          rate,
          effective_at: payload.date
            ? `${payload.date}T00:00:00Z`
            : providerTimestamp > 0
              ? new Date(providerTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          source_name: baseCurrency === "CDF"
            ? "ExchangeRate-API open access (https://www.exchangerate-api.com)"
            : "Frankfurter / ECB reference",
        },
        {
          onConflict: "organization_id,base_currency,quote_currency,effective_at",
        },
      );
    } catch {
      // 缺少已验证汇率时保留原币价格，不再用 1:1 伪造人民币价格。
    }
  }
}

async function readTaskBusinessOutcome(
  admin: ReturnType<typeof createClient>,
  taskId: string,
) {
  const candidates = await admin
    .from("wpi_price_collection_leads")
    .select("id,currency,fx_status,normalized_price_cny")
    .eq("task_id", taskId)
    .eq("price_validity_status", "valid")
    .eq("duplicate_status", "unique")
    .neq("risk_level", "critical");
  if (candidates.error) throw candidates.error;

  const fxReadyIds = (candidates.data ?? [])
    .filter((lead) =>
      text(lead.currency).toUpperCase() === "CNY" ||
      (text(lead.fx_status) === "verified" && number(lead.normalized_price_cny) > 0)
    )
    .map((lead) => text(lead.id))
    .filter(Boolean);
  let qualifiedLeadCount = 0;
  if (fxReadyIds.length) {
    const evidence = await admin
      .from("wpi_price_collection_evidence")
      .select("lead_id")
      .in("lead_id", fxReadyIds);
    if (evidence.error) throw evidence.error;
    qualifiedLeadCount = new Set(
      (evidence.data ?? []).map((row) => text(row.lead_id)).filter(Boolean),
    ).size;
  }

  const [catalog, evidence] = await Promise.all([
    admin
      .from("wpi_equipment_catalog")
      .select("id", { count: "exact", head: true })
      .eq("collection_task_id", taskId),
    admin
      .from("wpi_price_collection_evidence")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId),
  ]);
  if (catalog.error) throw catalog.error;
  if (evidence.error) throw evidence.error;
  return {
    qualifiedLeadCount,
    catalogCandidateCount: catalog.count ?? 0,
    evidenceCount: evidence.count ?? 0,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey)
    return json({ error: "Collector runtime is not configured" }, 500);

  const body = (await request.json().catch(() => ({}))) as Json;
  const suppliedCronSecret = request.headers.get("x-wpi-cron-secret") || "";
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const cronVerification = suppliedCronSecret
    ? await admin.rpc("wpi_verify_collection_cron_secret", {
        candidate_secret: suppliedCronSecret,
      })
    : { data: false, error: null };
  const cronAuthorized =
    cronVerification.data === true && !cronVerification.error;

  if (text(body.action) === "run_due") {
    if (!cronAuthorized)
      return json({ error: "Unauthorized scheduler request" }, 401);
    const claimed = await admin.rpc("wpi_claim_due_price_collection_tasks", {
      // Each worker has its own wall-clock budget. Keep the scheduler fan-out
      // bounded so the outer Edge request cannot time out while awaiting jobs.
      batch_size: Math.max(1, Math.min(2, number(body.batchSize) || 2)),
    });
    if (claimed.error) return json({ error: claimed.error.message }, 500);
    const tasks = (claimed.data || []) as TaskRow[];
    const results = await Promise.all(tasks.map(async (task) => {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/wpi-price-collector`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wpi-cron-secret": suppliedCronSecret,
          },
          body: JSON.stringify({ taskId: task.id, triggerType: "schedule" }),
        },
      );
      return {
        taskId: task.id,
        ok: response.ok,
        status: response.status,
      };
    }));
    const sourceRuns = await dispatchSourceRuns(
      admin,
      supabaseUrl,
      suppliedCronSecret,
      number(body.sourceConcurrency) || 3,
      "",
    );
    return json({
      data: {
        claimed: tasks.length,
        results,
        claimedSourceRuns: sourceRuns.length,
        sourceConcurrency: Math.max(1, Math.min(8, number(body.sourceConcurrency) || 3)),
      },
    });
  }

  const authorization = request.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData } = cronAuthorized
    ? { data: { user: null } }
    : await userClient.auth.getUser();
  const user = userData.user;
  if (!user && !cronAuthorized) return json({ error: "Unauthorized" }, 401);

  if (text(body.action) === "validate_api_integration") {
    if (!user) return json({ error: "Unauthorized" }, 401);
    const integrationId = text(body.integrationId);
    if (!integrationId) return json({ error: "缺少 API 集成 ID" }, 400);
    const integrationRow = await admin
      .from("wpi_integrations")
      .select("id,organization_id,endpoint_url")
      .eq("id", integrationId)
      .eq("integration_type", "data_source")
      .maybeSingle();
    if (integrationRow.error || !integrationRow.data)
      return json(
        { error: integrationRow.error?.message || "API 集成不存在" },
        404,
      );
    const membership = await admin
      .from("wpi_organization_members")
      .select("role,is_active")
      .eq("organization_id", integrationRow.data.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership.data || !writableRoles.has(String(membership.data.role)))
      return json({ error: "当前账号没有 API 凭证验证权限" }, 403);
    const runtimeResult = await admin.rpc(
      "wpi_get_collection_runtime_integration",
      {
        target_organization_id: integrationRow.data.organization_id,
        target_integration_id: integrationId,
      },
    );
    const runtime = (runtimeResult.data?.[0] ||
      null) as RuntimeIntegration | null;
    if (runtimeResult.error || !runtime)
      return json(
        { error: runtimeResult.error?.message || "API 运行配置不存在" },
        404,
      );
    if (runtime.credential_state !== "configured" || !runtime.credential_secret)
      return json({ error: "API 凭证尚未配置" }, 409);
    const endpoint = text(
      runtime.endpoint_url || integrationRow.data.endpoint_url,
    );
    if (!endpoint.startsWith("https://"))
      return json({ error: "API 地址必须使用 HTTPS" }, 400);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        redirect: "error",
        headers: {
          Accept: "application/json,text/plain;q=0.8",
          ...runtimeHeaders(runtime),
        },
      });
      if (!response.ok) throw new Error(`API 返回 HTTP ${response.status}`);
      await admin
        .from("wpi_integrations")
        .update({
          status: "active",
          last_validated_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          last_error: null,
          updated_by: user.id,
        })
        .eq("id", integrationId);
      return json({
        data: {
          valid: true,
          status: response.status,
          contentType: response.headers.get("content-type"),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "API 连通验证失败";
      await admin
        .from("wpi_integrations")
        .update({
          status: "error",
          last_validated_at: new Date().toISOString(),
          last_error: message,
          updated_by: user.id,
        })
        .eq("id", integrationId);
      return json({ error: message }, 422);
    } finally {
      clearTimeout(timeout);
    }
  }

  const taskId = text(body.taskId);
  if (!taskId) return json({ error: "缺少采集任务 ID" }, 400);

  const taskResult = await admin
    .from("wpi_price_collection_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (taskResult.error || !taskResult.data)
    return json({ error: taskResult.error?.message || "采集任务不存在" }, 404);
  const task = taskResult.data as TaskRow;
  const actorId = user?.id || task.created_by;
  const sourceRunId = text(body.sourceRunId);
  let sourceRun: SourceRunRow | null = null;
  if (sourceRunId) {
    const sourceRunResult = await admin
      .from("wpi_price_collection_source_runs")
      .select("*")
      .eq("id", sourceRunId)
      .eq("task_id", task.id)
      .maybeSingle();
    if (sourceRunResult.error || !sourceRunResult.data) {
      return json({ error: sourceRunResult.error?.message || "来源运行记录不存在" }, 404);
    }
    sourceRun = sourceRunResult.data as SourceRunRow;
  }
  if (!cronAuthorized) {
    const membership = await admin
      .from("wpi_organization_members")
      .select("role,is_active")
      .eq("organization_id", task.organization_id)
      .eq("user_id", actorId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership.data || !writableRoles.has(String(membership.data.role)))
      return json({ error: "当前账号没有采集执行权限" }, 403);
  }
  if (!(["web", "api"] as string[]).includes(task.collection_mode))
    return json({ error: "该任务不是网页/API采集模式" }, 409);

  const operation = text(body.operation) || "start";
  const requestedDiscoveryIds = Array.isArray(body.discoveryIds)
    ? body.discoveryIds.filter((id): id is string => typeof id === "string")
    : [];
  let requeuedCount = 0;
  if (operation === "retry_failed") {
    let requeueQuery = admin
      .from("wpi_equipment_collection_discoveries")
      .update({
        status: "queued",
        run_id: null,
        error_message: null,
        http_status: null,
        fetched_at: null,
        updated_by: actorId,
      })
      .eq("organization_id", task.organization_id)
      .eq("task_id", task.id)
      .in("status", ["failed", "blocked"]);
    if (sourceRun) requeueQuery = requeueQuery.eq("source_id", sourceRun.source_id);
    if (requestedDiscoveryIds.length) {
      requeueQuery = requeueQuery.in("id", requestedDiscoveryIds);
    }
    const requeued = await requeueQuery.select("id");
    if (requeued.error) return json({ error: requeued.error.message }, 500);
    requeuedCount = requeued.data?.length || 0;
    if (!requeuedCount) return json({ error: "当前没有可重试的失败资源" }, 409);
  } else if (operation === "incremental") {
    let requeueQuery = admin
      .from("wpi_equipment_collection_discoveries")
      .update({
        status: "queued",
        run_id: null,
        error_message: null,
        http_status: null,
        fetched_at: null,
        updated_by: actorId,
      })
      .eq("organization_id", task.organization_id)
      .eq("task_id", task.id)
      .neq("resource_type", "pdf")
      .in("status", ["fetched", "tracked", "skipped"]);
    if (sourceRun) requeueQuery = requeueQuery.eq("source_id", sourceRun.source_id);
    const requeued = await requeueQuery.select("id");
    if (requeued.error) return json({ error: requeued.error.message }, 500);
    requeuedCount = requeued.data?.length || 0;
  }

  const configuredSourceIds = Array.isArray(task.config.sourceIds)
    ? task.config.sourceIds.filter((id): id is string => typeof id === "string")
    : [];
  let sourceQuery = admin
    .from("wpi_price_collection_sources")
    .select("*")
    .eq("organization_id", task.organization_id)
    .eq("is_active", true);
  if (sourceRun)
    sourceQuery = sourceQuery.eq("id", sourceRun.source_id);
  else if (configuredSourceIds.length)
    sourceQuery = sourceQuery.in("id", configuredSourceIds);
  else sourceQuery = sourceQuery.eq("source_kind", task.collection_mode);
  const sourceResult = await sourceQuery
    .order("quality_score", { ascending: false })
    .limit(20);
  if (sourceResult.error)
    return json({ error: sourceResult.error.message }, 500);
  const sources = (sourceResult.data || []) as SourceRow[];
  if (!sources.length)
    return json({ error: "任务没有可用的白名单采集来源" }, 409);

  const attempt = task.retry_count + 1;
  const startingProgress = Math.max(3, Math.min(95, number(task.progress) || 3));
  if (!sourceRun) {
    const parentRunInsert = await admin
      .from("wpi_price_collection_runs")
      .insert({
        organization_id: task.organization_id,
        task_id: task.id,
        run_kind: "parent",
        trigger_type: text(body.triggerType) || "manual",
        attempt,
        status: "running",
        progress: startingProgress,
        current_source: `等待来源调度 · 0/${sources.length} 已完成`,
        requested_by: actorId,
        started_at: new Date().toISOString(),
        metrics: {
          sourceLevelScheduling: true,
          sourceConcurrency: Math.max(1, Math.min(8, number(task.config.sourceConcurrency) || 3)),
        },
      })
      .select("*")
      .single();
    if (parentRunInsert.error || !parentRunInsert.data) {
      return json({ error: parentRunInsert.error?.message || "无法创建采集主运行" }, 500);
    }
    const defaultBudget = Math.max(
      1,
      Math.min(
        500,
        number(task.config.maxPagesPerSource) ||
          number(task.config.pagesPerSource) ||
          number(task.config.maxPages) ||
          18,
      ),
    );
    const sourceRunRows = sources.map((source) => {
      let host = source.base_url;
      try {
        host = new URL(source.base_url).hostname.toLowerCase();
      } catch {
        // The source validator owns URL diagnostics; retain the URL as a lock key.
      }
      return {
        organization_id: task.organization_id,
        task_id: task.id,
        parent_run_id: parentRunInsert.data.id,
        source_id: source.id,
        source_name: source.name,
        source_host: host,
        status: "queued",
        progress: 0,
        page_budget: Math.max(1, Math.min(500, number(source.config.pageBudget) || defaultBudget)),
        max_retries: Math.max(0, Math.min(10, task.max_retries || 3)),
        next_run_at: new Date().toISOString(),
      };
    });
    const sourceRunsInsert = await admin
      .from("wpi_price_collection_source_runs")
      .insert(sourceRunRows)
      .select("id");
    if (sourceRunsInsert.error) {
      await admin.from("wpi_price_collection_runs").update({
        status: "failed",
        progress: 100,
        error_message: sourceRunsInsert.error.message,
        finished_at: new Date().toISOString(),
      }).eq("id", parentRunInsert.data.id);
      return json({ error: sourceRunsInsert.error.message }, 500);
    }
    await admin.from("wpi_price_collection_tasks").update({
      status: "running",
      progress: startingProgress,
      started_at: new Date().toISOString(),
      finished_at: null,
      current_source: `已排队 ${sources.length} 个来源 · 并发上限 ${Math.max(1, Math.min(8, number(task.config.sourceConcurrency) || 3))}`,
      last_error: null,
      last_run_at: new Date().toISOString(),
      updated_by: actorId,
    }).eq("id", task.id);
    const claimedSourceRuns = await dispatchSourceRuns(
      admin,
      supabaseUrl,
      suppliedCronSecret,
      number(task.config.sourceConcurrency) || 3,
      authorization,
    );
    return json({
      data: {
        taskId: task.id,
        runId: parentRunInsert.data.id,
        status: "running",
        sourceRunCount: sourceRunRows.length,
        claimedSourceRunCount: claimedSourceRuns.length,
        sourceConcurrency: Math.max(1, Math.min(8, number(task.config.sourceConcurrency) || 3)),
        independentPageBudget: true,
      },
    });
  }

  const runInsert = await admin
    .from("wpi_price_collection_runs")
    .insert({
      organization_id: task.organization_id,
      task_id: task.id,
      run_kind: "source_attempt",
      parent_run_id: sourceRun.parent_run_id,
      source_run_id: sourceRun.id,
      trigger_type: text(body.triggerType) || "manual",
      attempt,
      status: "running",
      progress: startingProgress,
      current_source: sources[0]?.name,
      requested_by: actorId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (runInsert.error || !runInsert.data)
    return json(
      { error: runInsert.error?.message || "无法创建采集运行记录" },
      500,
    );
  const run = runInsert.data;
  const executionDeadline = Date.now() + EXECUTION_BUDGET_MS;
  await admin
    .from("wpi_price_collection_tasks")
    .update({
      status: "running",
      progress: startingProgress,
      started_at: new Date().toISOString(),
      finished_at: null,
      current_source: sources[0]?.name,
      last_error: null,
      last_run_at: new Date().toISOString(),
      updated_by: actorId,
    })
    .eq("id", task.id);

  await refreshCurrencyRates(admin, task.organization_id);

  let fetchedCount = 0;
  let createdLeadCount = 0;
  let updatedLeadCount = 0;
  let createdCatalogCount = 0;
  let updatedCatalogCount = 0;
  let duplicateCount = 0;
  let failedSourceCount = 0;
  const failedSourceIds = new Set<string>();
  const translationLeadIds = new Set<string>();
  let discoveredPageCount = 0;
  let discoveredProductCount = 0;
  let trackedPdfCount = 0;
  let queuedDocumentJobCount = 0;
  let skippedScopeCount = 0;
  let filteredByPricePeriodCount = 0;
  let unknownPriceDateCount = 0;
  const errors: string[] = [];
  const discoveryRecordLimit = task.target_type === "material"
    ? sourceRun?.page_budget ?? Math.max(1, Math.min(number(task.config.maxPages) || 40, 120))
    : Number.POSITIVE_INFINITY;
  let discoveryRecordResult: { count: number | null } = { count: 0 };
  if (task.target_type === "material") {
    let discoveryCountQuery = admin
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", task.organization_id)
      .eq("task_id", task.id)
      .neq("resource_type", "pdf");
    if (sourceRun) discoveryCountQuery = discoveryCountQuery.eq("source_id", sourceRun.source_id);
    discoveryRecordResult = await discoveryCountQuery;
  }
  let discoveryRecordCount = discoveryRecordResult.count || 0;

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    const source = sources[sourceIndex];
    let runtime: RuntimeIntegration | null = null;
    if (source.source_kind === "api") {
      if (!source.api_integration_id) {
        if (!failedSourceIds.has(source.id)) {
          failedSourceIds.add(source.id);
          failedSourceCount += 1;
        }
        errors.push(`${source.name}: 未关联 API 凭证`);
        continue;
      }
      const runtimeResult = await admin.rpc(
        "wpi_get_collection_runtime_integration",
        {
          target_organization_id: task.organization_id,
          target_integration_id: source.api_integration_id,
        },
      );
      runtime = (runtimeResult.data?.[0] || null) as RuntimeIntegration | null;
      if (
        runtimeResult.error ||
        !runtime?.credential_secret ||
        runtime.credential_state !== "configured"
      ) {
        if (!failedSourceIds.has(source.id)) {
          failedSourceIds.add(source.id);
          failedSourceCount += 1;
        }
        errors.push(`${source.name}: API 凭证未配置或不可用`);
        continue;
      }
    }

    const discoveryWorkflow =
      (text(task.config.workflow) === "equipment_catalog_full_collection" ||
        task.target_type === "material") &&
      source.source_kind === "web" &&
      source.discovery_enabled !== false;
    const pageLimit = Math.max(
      1,
      Math.min(
        number(task.config.pagesPerRun) || 40,
        sourceRun
          ? Math.max(1, sourceRun.page_budget - sourceRun.pages_used)
          : number(task.config.maxPages) || 40,
        6,
      ),
    );
    const pdfLimit = Math.max(
      0,
      Math.min(
        number(task.config.pdfsPerRun) || 80,
        number(task.config.maxPdfFiles) || 80,
        160,
      ),
    );
    const maxDepth = Math.max(0, Math.min(source.max_discovery_depth ?? 2, 5));
    let queuedResult: {
      data: Array<{
        id: string;
        resource_url: string;
        parent_url: string | null;
        resource_type: string;
        depth: number;
        page_title: string | null;
        mime_type: string | null;
      }> | null;
      error: { message: string } | null;
    } = { data: [], error: null };
    if (discoveryWorkflow) {
      let queuedQuery = admin
        .from("wpi_equipment_collection_discoveries")
        .select("id,resource_url,parent_url,resource_type,depth,page_title,mime_type")
        .eq("task_id", task.id)
        .eq("source_id", source.id)
        .eq("status", "queued");
      if (text(source.config.adapter) !== "caid_lokole_reports") {
        queuedQuery = queuedQuery.neq("resource_type", "pdf");
      }
      if (requestedDiscoveryIds.length) {
        queuedQuery = queuedQuery.in("id", requestedDiscoveryIds);
      }
      queuedResult = await queuedQuery
        .order("discovered_at", {
          ascending: text(source.config.adapter) !== "caid_lokole_reports",
        })
        .limit(Math.min(100, pageLimit * 6));
      if (queuedResult.error) throw new Error(`Discovery queue unavailable: ${queuedResult.error.message}`);
    }
    const initialQueue = (queuedResult.data || [])
      .sort((left, right) => {
        if (text(source.config.adapter) === "caid_lokole_reports") {
          const leftPeriod = normalizeMonthlyQuoteDate(`${left.resource_url} ${left.page_title || ""}`);
          const rightPeriod = normalizeMonthlyQuoteDate(`${right.resource_url} ${right.page_title || ""}`);
          return rightPeriod.localeCompare(leftPeriod);
        }
        return discoveryPriority(String(left.resource_type)) -
          discoveryPriority(String(right.resource_type));
      })
      .slice(0, text(source.config.adapter) === "caid_lokole_reports" ? 1 : pageLimit)
      .map((item) => ({
        discoveryId: String(item.id),
        url: String(item.resource_url),
        parentUrl: item.parent_url ? String(item.parent_url) : null,
        type: String(item.resource_type) as
          "seed" | "page" | "product" | "catalog" | "pdf",
        depth: Number(item.depth || 0),
        title: text(item.page_title),
        mimeType: text(item.mime_type),
      }));
    if (
      !initialQueue.length &&
      !requestedDiscoveryIds.length
    ) {
      initialQueue.push(
        ...sourceUrls(task, source).map((url) => ({
          url,
          parentUrl: null,
          type: "seed" as const,
          depth: 0,
          discoveryId: "",
          title: "",
          mimeType: "",
        })),
      );
    }
    if (
      !initialQueue.length &&
      requestedDiscoveryIds.length
    ) {
      continue;
    }
    const queue = initialQueue;
    const seen = new Set<string>();
    const registeredLinks = new Set<string>();
    let processedForSource = 0;
    let sourceSucceeded = false;
    let sourceLastError = "";

    while (
      queue.length &&
      processedForSource < pageLimit &&
      Date.now() < executionDeadline
    ) {
      const queued = queue.shift();
      if (!queued || seen.has(queued.url)) continue;
      seen.add(queued.url);
      try {
        const url = validateSourceUrl(queued.url, source);
        if (source.robots_policy === "respect") await checkRobots(url);
        const urlHash = await sha256(url.toString());
        const discoveryWrite = queued.discoveryId
          ? await admin.from("wpi_equipment_collection_discoveries")
            .update({ status: "fetching", run_id: run.id, updated_by: actorId })
            .eq("organization_id", task.organization_id)
            .eq("task_id", task.id)
            .eq("source_id", source.id)
            .eq("id", queued.discoveryId)
            .eq("status", "queued")
            .select("id").maybeSingle()
          : await admin
          .from("wpi_equipment_collection_discoveries")
          .upsert(
            {
              organization_id: task.organization_id,
              task_id: task.id,
              run_id: run.id,
              source_id: source.id,
              resource_url: url.toString(),
              url_hash: urlHash,
              parent_url: queued.parentUrl,
              resource_type: queued.type,
              depth: queued.depth,
              status: "fetching",
              created_by: actorId,
              updated_by: actorId,
            },
            { onConflict: "organization_id,task_id,source_id,url_hash" },
          )
          .select("id")
          .single();
        if (queued.discoveryId && !discoveryWrite.error && !discoveryWrite.data) continue;
        if (discoveryWrite.error || !discoveryWrite.data)
          throw discoveryWrite.error || new Error("无法登记采集发现记录");
        const discoveryId = String(discoveryWrite.data.id);

        if (
          queued.type === "pdf" &&
          task.target_type === "material" &&
          text(source.config.adapter) === "caid_lokole_reports"
        ) {
          const parsed = await processCaidPriceReport({
            admin,
            supabaseUrl,
            serviceRoleKey,
            task,
            runId: run.id,
            source,
            discoveryId,
            documentUrl: url.toString(),
            documentTitle: queued.title,
            mimeType: queued.mimeType || (/\.xlsx?(?:$|[?#])/i.test(url.toString())
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf"),
            actorId,
          });
          createdLeadCount += parsed.created;
          updatedLeadCount += parsed.updated;
          duplicateCount += parsed.duplicates;
          filteredByPricePeriodCount += parsed.filteredByPricePeriod;
          unknownPriceDateCount += parsed.unknownPriceDate;
          parsed.leadIds.forEach((leadId) => translationLeadIds.add(leadId));
          fetchedCount += 1;
          processedForSource += 1;
          sourceSucceeded = true;
          continue;
        }

        const fetched = text(source.config.adapter) === "talo_public_json"
          ? await fetchTaloSource(source, task)
          : await fetchSource(url, source, runtimeHeaders(runtime));
        fetchedCount += 1;
        processedForSource += 1;
        const unavailableReason = fetched.contentType.includes("text/html")
          ? unavailablePageReason(fetched.body)
          : "";
        if (unavailableReason) throw new Error(unavailableReason);
        sourceSucceeded = true;
        const finalUrl = new URL(fetched.response.url);
        const detailSignals = productDetailSignals(
          fetched.body,
          finalUrl,
          queued.type,
        );
        const priceExtractionEligible =
          fetched.contentType.includes("application/json") ||
          isQualifiedProductDetail(detailSignals);
        const redirectedToAuthentication =
          finalUrl.origin === url.origin &&
          /\/(?:user\/)?(?:login|signin)(?:[/?#]|$)/i.test(finalUrl.pathname);
        if (redirectedToAuthentication) {
          await admin
            .from("wpi_equipment_collection_discoveries")
            .update({
              run_id: run.id,
              status: "blocked",
              http_status: fetched.response.status,
              fetched_at: new Date().toISOString(),
              error_message: "来源需要登录或授权，当前采集凭证不可用",
              updated_by: actorId,
              metadata: {
                canonicalUrl: fetched.response.url,
                authRequired: true,
                blockedReason: "authentication_required",
                requiresHumanReview: true,
              },
            })
            .eq("organization_id", task.organization_id)
            .eq("task_id", task.id)
            .eq("source_id", source.id)
            .eq("url_hash", urlHash);
          continue;
        }
        const excerpt = stripHtml(fetched.body).slice(0, 4000);
        const pageTitle = text(
          fetched.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
        );
        const contentHash = await sha256(`${fetched.response.url}|${excerpt}`);
        const scopeAccepted =
          queued.type !== "product" ||
          matchesTaskScope(fetched.body, url, pageTitle, task);
        await admin
          .from("wpi_equipment_collection_discoveries")
          .update({
            run_id: run.id,
            status: scopeAccepted ? "fetched" : "skipped",
            page_title: pageTitle || null,
            mime_type: fetched.contentType,
            http_status: fetched.response.status,
            content_hash: contentHash,
            fetched_at: new Date().toISOString(),
            error_message: null,
            updated_by: actorId,
            metadata: {
              canonicalUrl: fetched.response.url,
              scopePreset: text(task.config.scopePreset) || "all",
              scopeAccepted,
              pageKind: priceExtractionEligible ? "product_detail" : "discovery_page",
              priceExtractionEligible,
              detailSignals,
              requiresHumanReview: true,
            },
          })
          .eq("organization_id", task.organization_id)
          .eq("task_id", task.id)
          .eq("source_id", source.id)
          .eq("url_hash", urlHash);

        if (!scopeAccepted) {
          skippedScopeCount += 1;
          continue;
        }

        let discoveredLinks: DiscoveredLink[] = [];
        if (
          discoveryWorkflow &&
          fetched.contentType.includes("text/html") &&
          (task.target_type !== "material" ||
            discoveryRecordCount < discoveryRecordLimit)
        ) {
          const links = discoverLinks(fetched.body, url, source, task);
          discoveredLinks = links;
          const preferredCaidDocumentByPeriod = new Map<string, DiscoveredLink>();
          if (text(source.config.adapter) === "caid_lokole_reports") {
            for (const candidateLink of links.filter(isCaidMonthlyPriceReport)) {
              const period = normalizeMonthlyQuoteDate(`${candidateLink.url} ${candidateLink.title}`).slice(0, 7);
              if (!period) continue;
              const current = preferredCaidDocumentByPeriod.get(period);
              const candidateIsSpreadsheet = /\.xlsx?(?:$|[?#])/i.test(candidateLink.url);
              const currentIsSpreadsheet = current ? /\.xlsx?(?:$|[?#])/i.test(current.url) : false;
              if (!current || (candidateIsSpreadsheet && !currentIsSpreadsheet)) {
                preferredCaidDocumentByPeriod.set(period, candidateLink);
              }
            }
          }
          for (const link of links) {
            const linkHash = await sha256(link.url);
            if (registeredLinks.has(linkHash)) continue;
            registeredLinks.add(linkHash);
            const isDocument = link.type === "pdf";
            const documentFormat = text(link.metadata?.documentFormat) || "pdf";
            const parseCaidDocument = isDocument &&
              text(source.config.adapter) === "caid_lokole_reports" &&
              isCaidMonthlyPriceReport(link) &&
              preferredCaidDocumentByPeriod.get(
                  normalizeMonthlyQuoteDate(`${link.url} ${link.title}`).slice(0, 7),
                )?.url === link.url;
            if (!isDocument && queued.depth >= maxDepth) continue;
            if (!isDocument && discoveryRecordCount >= discoveryRecordLimit) continue;
            if (isDocument && trackedPdfCount >= pdfLimit) continue;
            const insertResult = await admin
              .from("wpi_equipment_collection_discoveries")
              .upsert(
                {
                  organization_id: task.organization_id,
                  task_id: task.id,
                  run_id: run.id,
                  source_id: source.id,
                  resource_url: link.url,
                  url_hash: linkHash,
                  parent_url: url.toString(),
                  resource_type: link.type,
                  depth: queued.depth + 1,
                  status: isDocument && !parseCaidDocument ? "tracked" : "queued",
                  page_title: link.title || null,
                  mime_type: isDocument
                    ? ["xls", "xlsx"].includes(documentFormat)
                      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      : "application/pdf"
                    : null,
                  metadata: {
                    discoveredFrom: url.toString(),
                    requiresHumanReview: true,
                    ...(link.metadata || {}),
                  },
                  created_by: actorId,
                  updated_by: actorId,
                },
                {
                  onConflict: "organization_id,task_id,source_id,url_hash",
                  ignoreDuplicates: true,
                },
              )
              .select("id");
            if (insertResult.error) throw insertResult.error;
            const isNewDiscovery = Boolean(insertResult.data?.length);
            if (isDocument) {
              if (isNewDiscovery) {
                trackedPdfCount += 1;
                const evidenceHash = await sha256(`pdf-link|${link.url}`);
                await admin.from("wpi_price_collection_evidence").upsert(
                  {
                    organization_id: task.organization_id,
                    task_id: task.id,
                    run_id: run.id,
                    source_id: source.id,
                    evidence_code: `EV-PDF-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
                    source_url: link.url,
                    canonical_url: link.url,
                    page_title: link.title ||
                      (["xls", "xlsx"].includes(documentFormat) ? "Excel 原始价格数据" : "PDF 月度价格报告"),
                    excerpt:
                      ["xls", "xlsx"].includes(documentFormat)
                        ? "由 CAID 官方页面发现的 Excel 原始价格数据，等待解析与人工审核。"
                        : "由已验证来源页面发现的 PDF 链接，等待文档解析与人工审核。",
                    content_hash: evidenceHash,
                    mime_type: documentFormat === "xlsx"
                      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      : documentFormat === "xls"
                        ? "application/vnd.ms-excel"
                      : "application/pdf",
                    metadata: {
                      resourceKind: "document",
                      documentFormat,
                      parentUrl: url.toString(),
                      trackedOnly: !parseCaidDocument,
                      parseStatus: parseCaidDocument ? "queued" : "not_applicable",
                      requiresHumanReview: true,
                      ...(link.metadata || {}),
                    },
                    created_by: actorId,
                  },
                  { onConflict: "organization_id,task_id,observation_key" },
                );
              }
            } else {
              if (isNewDiscovery) {
                discoveredPageCount += 1;
                discoveryRecordCount += 1;
                if (link.type === "product") discoveredProductCount += 1;
              }
              if (queue.length + processedForSource < pageLimit)
                queue.push({
                  url: link.url,
                  parentUrl: url.toString(),
                  type: link.type === "pdf" ? "page" : link.type,
                  depth: queued.depth + 1,
                  discoveryId: "",
                  title: link.title,
                  mimeType: "",
                });
            }
          }
        }

        if (
          discoveryWorkflow &&
          task.target_type === "equipment" &&
          queued.type === "product" &&
          fetched.contentType.includes("text/html")
        ) {
          const discoveredPdfs = discoveredLinks.filter(
            (link) => link.type === "pdf",
          );
          const catalogCandidates = extractCatalogCandidates(
            fetched.body,
            url,
            pageTitle,
            source,
          ).slice(0, 8);
          for (const catalogCandidate of catalogCandidates) {
            const matchedPdfs = matchDocumentsToCatalogCandidate(
              catalogCandidate,
              discoveredPdfs,
              catalogCandidates.length,
            );
            const persisted = await persistCatalogCandidate(
              admin,
              task,
              run.id,
              source,
              discoveryId,
              {
                ...catalogCandidate,
                datasheetUrl:
                  catalogCandidate.datasheetUrl || matchedPdfs[0]?.url || null,
              },
              actorId,
              matchedPdfs,
            );
            if (persisted.created) createdCatalogCount += 1;
            else updatedCatalogCount += 1;
          }
        }

        if (
          discoveryWorkflow &&
          task.target_type === "equipment" &&
          queued.type === "catalog" &&
          fetched.contentType.includes("text/html")
        ) {
          const discoveredDocuments = discoveredLinks.filter(
            (link) => link.type === "pdf",
          );
          const technicalParameters = htmlTableParameters(fetched.body);
          const parentProductUrl =
            queued.parentUrl ||
            url.toString().replace(/\/(?:technical|specifications?|downloads?)(?:[/?#].*)?$/i, "");
          queuedDocumentJobCount += await persistCatalogDocumentsForParent(
            admin,
            task,
            run.id,
            source,
            parentProductUrl,
            discoveredDocuments,
            actorId,
          );
          const updated = await persistCatalogTechnicalParameters(
            admin,
            task,
            run.id,
            discoveryId,
            parentProductUrl,
            url.toString(),
            technicalParameters,
            actorId,
          );
          if (updated) updatedCatalogCount += 1;
        }

        if (task.config.acceptanceTest === true) {
          await admin
            .from("wpi_equipment_collection_discoveries")
            .update({
              metadata: {
                canonicalUrl: fetched.response.url,
                scopeAccepted: true,
                processingStage: "before_price_extraction",
                requiresHumanReview: true,
              },
              updated_by: actorId,
            })
            .eq("id", discoveryId);
        }
        const candidates = extractCandidates(
          fetched.body,
          fetched.contentType,
          task,
          source,
          finalUrl,
          queued.type,
        ).slice(0, Number(task.config.maxResults || 50));
        if (task.config.acceptanceTest === true) {
          await admin
            .from("wpi_equipment_collection_discoveries")
            .update({
              metadata: {
                canonicalUrl: fetched.response.url,
                scopeAccepted: true,
                processingStage: "after_price_extraction",
                candidateCount: candidates.length,
                candidatePreview: candidates[0] || null,
                requiresHumanReview: true,
              },
              updated_by: actorId,
            })
            .eq("id", discoveryId);
        }
        if (!candidates.length) {
          await admin.from("wpi_price_collection_evidence").upsert(
            {
              organization_id: task.organization_id,
              task_id: task.id,
              run_id: run.id,
              source_id: source.id,
              evidence_code: `EV-WEB-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
              source_url: url.toString(),
              canonical_url: fetched.response.url,
              page_title: pageTitle,
              excerpt,
              content_hash: contentHash,
              http_status: fetched.response.status,
              mime_type: fetched.contentType,
              metadata: {
                candidateCount: 0,
                discoveryWorkflow,
                pageKind: priceExtractionEligible ? "product_detail" : "discovery_page",
                priceExtractionEligible,
                detailSignals,
                requiresHumanReview: true,
              },
              created_by: actorId,
            },
            { onConflict: "organization_id,task_id,observation_key" },
          );
        }
        for (const extractedCandidate of candidates) {
          const candidate = applyPriceAgeRule(extractedCandidate, task);
          const periodDecision = candidatePricePeriodDecision(candidate, task);
          if (periodDecision !== "accepted") {
            filteredByPricePeriodCount += 1;
            if (periodDecision === "unknown_date") unknownPriceDateCount += 1;
            continue;
          }
          const ingest = await admin.rpc(
            "wpi_ingest_price_collection_candidate",
            {
              target_task_id: task.id,
              target_run_id: run.id,
              target_source_id: source.id,
              candidate,
              evidence: {
                sourceUrl: url.toString(),
                canonicalUrl: fetched.response.url,
                pageTitle: text(
                  fetched.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
                ),
                excerpt: candidate.priceContext || excerpt,
                httpStatus: fetched.response.status,
                mimeType: fetched.contentType,
                metadata: {
                  extractionStrategy: source.extraction_strategy,
                  extractionMethod: candidate.extractionMethod,
                  priceValidityStatus: candidate.validationStatus,
                  validationReasons: candidate.validationReasons,
                  originalPriceText: candidate.originalPriceText,
                  quoteDate: candidate.quoteDate || null,
                  pricePeriodGranularity: ["talo_public_json", "caid_lokole_reports"].includes(text(source.config.adapter))
                    ? "month"
                    : candidate.quoteDate
                      ? "day"
                      : "unknown",
                  priceContext: candidate.priceContext,
                  pageKind: candidate.pageKind,
                  detailSignals: candidate.detailSignals,
                  requiresHumanReview: true,
                },
              },
            },
          );
          if (ingest.error) throw ingest.error;
          if (ingest.data?.leadId) {
            const knownTranslation = knownMaterialTranslation(candidate);
            if (knownTranslation) {
              const translationUpdate = await admin
                .from("wpi_price_collection_leads")
                .update(knownTranslation)
                .eq("id", ingest.data.leadId);
              if (translationUpdate.error) throw translationUpdate.error;
            } else {
              translationLeadIds.add(ingest.data.leadId);
            }
          }
          if (candidate.quoteDate && ingest.data?.leadId) {
            const quoteDateUpdate = await admin
              .from("wpi_price_collection_leads")
              .update({
                quote_date: candidate.quoteDate,
                price_period_granularity: text(source.config.adapter) === "talo_public_json" ? "month" : "day",
              })
              .eq("id", ingest.data.leadId);
            if (quoteDateUpdate.error) throw quoteDateUpdate.error;
          }
          if (candidate.validationStatus !== "valid") continue;
          if (ingest.data?.created) createdLeadCount += 1;
          else updatedLeadCount += 1;
          if (ingest.data?.duplicate) duplicateCount += 1;
        }
      } catch (error) {
        if (!failedSourceIds.has(source.id)) {
          failedSourceIds.add(source.id);
          failedSourceCount += 1;
        }
        const message = errorMessage(error);
        sourceLastError = message;
        errors.push(`${source.name}: ${message}`);
        const failedHash = await sha256(queued.url);
        await admin
          .from("wpi_equipment_collection_discoveries")
          .update({
            run_id: run.id,
            status: "failed",
            error_message: message,
            fetched_at: new Date().toISOString(),
            updated_by: actorId,
            ...(queued.type === "pdf" && text(source.config.adapter) === "caid_lokole_reports"
              ? {
                  metadata: {
                    parseStatus: "failed",
                    parser: "caid-price-report-v1",
                    parseFailedAt: new Date().toISOString(),
                    retryable: true,
                    requiresHumanReview: true,
                  },
                }
              : {}),
          })
          .eq("organization_id", task.organization_id)
          .eq("task_id", task.id)
          .eq("source_id", source.id)
          .eq("url_hash", failedHash);
      }
    }
    await admin
      .from("wpi_price_collection_sources")
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: sourceLastError || (sourceSucceeded ? null : "来源采集失败"),
        updated_by: actorId,
      })
      .eq("id", source.id);
    const progress = Math.min(
      95,
      Math.round(((sourceIndex + 1) / sources.length) * 90) + 5,
    );
    await admin
      .from("wpi_price_collection_runs")
      .update({ progress, current_source: source.name })
      .eq("id", run.id);
    await admin
      .from("wpi_price_collection_tasks")
      .update({ progress, current_source: source.name, updated_by: actorId })
      .eq("id", task.id);
    if (Date.now() >= executionDeadline) break;
  }

  let allDiscoveryQuery = admin
    .from("wpi_equipment_collection_discoveries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", task.organization_id)
    .eq("task_id", task.id);
  let queuedDiscoveryQuery = admin
    .from("wpi_equipment_collection_discoveries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", task.organization_id)
    .eq("task_id", task.id)
    .eq("status", "queued");
  if (sourceRun) {
    allDiscoveryQuery = allDiscoveryQuery.eq("source_id", sourceRun.source_id);
    queuedDiscoveryQuery = queuedDiscoveryQuery.eq("source_id", sourceRun.source_id);
  }
  const [allDiscoveryResult, queuedDiscoveryResult] = await Promise.all([
    allDiscoveryQuery,
    queuedDiscoveryQuery,
  ]);
  const discoveryTotal = allDiscoveryResult.count || 0;
  const remainingQueued = queuedDiscoveryResult.count || 0;
  const sourceEvidenceResult = sourceRun
    ? await admin
        .from("wpi_price_collection_evidence")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", task.organization_id)
        .eq("task_id", task.id)
        .eq("source_id", sourceRun.source_id)
    : { count: 0 };
  const sourceEvidenceCount = sourceEvidenceResult.count || 0;

  const dispatchDocumentWorker = async (): Promise<Json | null> => {
    const { count } = await admin
      .from("wpi_equipment_catalog_document_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", task.organization_id)
      .eq("status", "queued");
    if ((count ?? 0) === 0) return null;

    try {
      const workerResponse = await fetch(
        `${supabaseUrl}/functions/v1/wpi-equipment-document-worker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            organizationId: task.organization_id,
            taskId: task.id,
            limit: 2,
          }),
        },
      );
      const workerPayload = await workerResponse.json().catch(() => ({}));
      return workerResponse.ok
        ? object(workerPayload.data)
        : { error: text(workerPayload.error) || `HTTP ${workerResponse.status}` };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "文档Worker启动失败",
      };
    }
  };

  const documentWorker: Json | null = await dispatchDocumentWorker();

  if (remainingQueued > 0) {
    const finishedAt = new Date().toISOString();
    const batchProgress = Math.max(
      3,
      Math.min(
        95,
        discoveryTotal
          ? Math.round(((discoveryTotal - remainingQueued) / discoveryTotal) * 100)
          : 3,
        ),
    );
    if (sourceRun) {
      const pagesUsed = Math.min(sourceRun.page_budget, sourceRun.pages_used + fetchedCount);
      const quotaExhausted = pagesUsed >= sourceRun.page_budget;
      const mayRetry = !quotaExhausted && sourceRun.attempt < sourceRun.max_retries;
      await admin.from("wpi_price_collection_runs").update({
        status: "partial",
        progress: batchProgress,
        fetched_count: fetchedCount,
        created_lead_count: createdLeadCount,
        updated_lead_count: updatedLeadCount,
        duplicate_count: duplicateCount,
        failed_source_count: failedSourceCount,
        error_message: errors.slice(0, 6).join(" | ") || null,
        finished_at: finishedAt,
        metrics: { sourceRunId: sourceRun.id, remainingQueued, quotaExhausted, filteredByPricePeriodCount, unknownPriceDateCount },
      }).eq("id", run.id);
      await admin.from("wpi_price_collection_source_runs").update({
        status: mayRetry ? "partial" : "completed",
        progress: quotaExhausted
          ? 100
          : Math.max(3, Math.min(95, Math.round((pagesUsed / sourceRun.page_budget) * 100))),
        pages_used: pagesUsed,
        fetched_count: sourceRun.fetched_count + fetchedCount,
        evidence_count: sourceEvidenceCount,
        created_lead_count: sourceRun.created_lead_count + createdLeadCount,
        updated_lead_count: sourceRun.updated_lead_count + updatedLeadCount,
        duplicate_count: sourceRun.duplicate_count + duplicateCount,
        failed_count: sourceRun.failed_count + failedSourceCount,
        current_resource: `剩余 ${remainingQueued} 条待处理资源`,
        error_message: errors.slice(0, 6).join(" | ") || null,
        next_run_at: new Date(Date.now() + (mayRetry ? 10_000 : 0)).toISOString(),
        finished_at: finishedAt,
        metrics: {
          discoveredPages: discoveredPageCount,
          discoveredProducts: discoveredProductCount,
          remainingQueued,
          quotaExhausted,
          continuationRequired: mayRetry,
          filteredByPricePeriodCount,
          unknownPriceDateCount,
        },
      }).eq("id", sourceRun.id);
      await admin.rpc("wpi_refresh_price_collection_parent_run", {
        target_parent_run_id: sourceRun.parent_run_id,
      });
      if (translationLeadIds.size > 0) {
        dispatchLeadTranslation(
          supabaseUrl,
          serviceRoleKey,
          task.organization_id,
          task.id,
          actorId,
          [...translationLeadIds],
        );
      }
      await dispatchSourceRuns(
        admin,
        supabaseUrl,
        suppliedCronSecret,
        number(task.config.sourceConcurrency) || 3,
        authorization,
      );
      return json({
        data: {
          taskId: task.id,
          runId: run.id,
          sourceRunId: sourceRun.id,
          status: mayRetry ? "partial" : "completed",
          progress: quotaExhausted ? 100 : batchProgress,
          fetchedCount,
          createdLeadCount,
          updatedLeadCount,
          pagesUsed,
          pageBudget: sourceRun.page_budget,
          remainingQueued,
          quotaExhausted,
          continuationRequired: mayRetry,
          requiresHumanReview: true,
        },
      });
    }
    await admin
      .from("wpi_price_collection_runs")
      .update({
        status: "partial",
        progress: batchProgress,
        fetched_count: fetchedCount,
        created_lead_count: createdLeadCount,
        updated_lead_count: updatedLeadCount,
        duplicate_count: duplicateCount,
        failed_source_count: failedSourceCount,
        error_message: errors.slice(0, 6).join(" | ") || null,
        finished_at: finishedAt,
        metrics: {
          sources: sources.length,
          discoveredPages: discoveredPageCount,
          discoveredProducts: discoveredProductCount,
          trackedPdfs: trackedPdfCount,
          skippedOutsideScope: skippedScopeCount,
          createdCatalogCandidates: createdCatalogCount,
          updatedCatalogCandidates: updatedCatalogCount,
          queuedDocumentJobs: queuedDocumentJobCount,
          documentWorker,
          remainingQueued,
          continuationRequired: true,
          operation,
          filteredByPricePeriodCount,
          unknownPriceDateCount,
        },
      })
      .eq("id", run.id);
    const businessOutcome = await readTaskBusinessOutcome(admin, task.id);
    await admin
      .from("wpi_price_collection_tasks")
      .update({
        status: "queued",
        progress: batchProgress,
        success_count: businessOutcome.qualifiedLeadCount,
        qualified_lead_count: businessOutcome.qualifiedLeadCount,
        catalog_candidate_count: businessOutcome.catalogCandidateCount,
        evidence_count: businessOutcome.evidenceCount,
        outcome_status: "pending",
        failed_count: failedSourceCount,
        current_source: `等待自动续跑 · 剩余 ${remainingQueued} 条`,
        last_error: errors.slice(0, 6).join(" | ") || null,
        next_run_at: new Date(Date.now() + 60_000).toISOString(),
        finished_at: null,
        updated_by: actorId,
      })
      .eq("id", task.id);
    return json({
      data: {
        taskId: task.id,
        runId: run.id,
        status: "partial",
        progress: batchProgress,
        fetchedCount,
        createdCatalogCount,
        updatedCatalogCount,
        queuedDocumentJobCount,
        documentWorker,
        remainingQueued,
        continuationRequired: true,
        requiresHumanReview: true,
      },
    });
  }

  const businessOutcome = await readTaskBusinessOutcome(admin, task.id);
  const succeeded = fetchedCount > 0;
  const runStatus = succeeded
    ? failedSourceCount
      ? "partial"
      : "completed"
    : "failed";
  const taskStatus = succeeded ? "completed" : "failed";
  const finishedAt = new Date().toISOString();
  const finalErrorMessage = errors.slice(0, 6).join(" | ") || null;
  await admin
    .from("wpi_price_collection_runs")
    .update({
      status: runStatus,
      progress: 100,
      fetched_count: fetchedCount,
      created_lead_count: createdLeadCount,
      updated_lead_count: updatedLeadCount,
      duplicate_count: duplicateCount,
      failed_source_count: failedSourceCount,
      error_message: finalErrorMessage,
      finished_at: finishedAt,
      metrics: {
        sources: sources.length,
        discoveredPages: discoveredPageCount,
        discoveredProducts: discoveredProductCount,
        trackedPdfs: trackedPdfCount,
        skippedOutsideScope: skippedScopeCount,
        createdCatalogCandidates: createdCatalogCount,
        updatedCatalogCandidates: updatedCatalogCount,
        scopePreset: text(task.config.scopePreset) || "all",
        evidenceRequired: true,
        aiFinalDecision: false,
        operation,
        requeuedCount,
        pricePeriod: taskPricePeriod(task),
        filteredByPricePeriodCount,
        unknownPriceDateCount,
      },
    })
    .eq("id", run.id);
  if (sourceRun) {
    const pagesUsed = Math.min(sourceRun.page_budget, sourceRun.pages_used + fetchedCount);
    await admin.from("wpi_price_collection_source_runs").update({
      status: runStatus === "failed" ? "failed" : runStatus,
      progress: 100,
      pages_used: pagesUsed,
      fetched_count: sourceRun.fetched_count + fetchedCount,
      evidence_count: sourceEvidenceCount,
      created_lead_count: sourceRun.created_lead_count + createdLeadCount,
      updated_lead_count: sourceRun.updated_lead_count + updatedLeadCount,
      duplicate_count: sourceRun.duplicate_count + duplicateCount,
      failed_count: sourceRun.failed_count + failedSourceCount,
      current_resource: null,
      error_message: finalErrorMessage,
      finished_at: finishedAt,
      metrics: {
        discoveredPages: discoveredPageCount,
        discoveredProducts: discoveredProductCount,
        trackedPdfs: trackedPdfCount,
        pageBudget: sourceRun.page_budget,
        filteredByPricePeriodCount,
        unknownPriceDateCount,
      },
    }).eq("id", sourceRun.id);
    await admin.rpc("wpi_refresh_price_collection_parent_run", {
      target_parent_run_id: sourceRun.parent_run_id,
    });
    if (translationLeadIds.size > 0) {
      dispatchLeadTranslation(
        supabaseUrl,
        serviceRoleKey,
        task.organization_id,
        task.id,
        actorId,
        [...translationLeadIds],
      );
    }
    await dispatchSourceRuns(
      admin,
      supabaseUrl,
      suppliedCronSecret,
      number(task.config.sourceConcurrency) || 3,
      authorization,
    );
  } else {
    await admin
      .from("wpi_price_collection_tasks")
      .update({
        status: taskStatus,
        progress: 100,
        success_count: businessOutcome.qualifiedLeadCount,
        qualified_lead_count: businessOutcome.qualifiedLeadCount,
        catalog_candidate_count: businessOutcome.catalogCandidateCount,
        evidence_count: businessOutcome.evidenceCount,
        outcome_status: !succeeded
          ? "blocked"
          : businessOutcome.qualifiedLeadCount > 0 && failedSourceCount > 0
            ? "partial"
            : businessOutcome.qualifiedLeadCount > 0
              ? "qualified"
              : "no_price",
        failed_count: failedSourceCount,
        current_source:
          businessOutcome.qualifiedLeadCount === 0
            ? `抓取完成，已保存 ${businessOutcome.evidenceCount} 条证据，但未形成合格价格候选`
            : "采集执行完成",
        last_error: finalErrorMessage,
        finished_at: finishedAt,
        retry_at: succeeded
          ? null
          : new Date(
              Date.now() + Math.min(60, 2 ** attempt) * 60_000,
            ).toISOString(),
        updated_by: actorId,
      })
      .eq("id", task.id);
  }

  return json(
    {
      error: succeeded
        ? null
        : finalErrorMessage || "来源未返回可解析的页面或价格记录",
      data: {
        taskId: task.id,
        runId: run.id,
        sourceRunId: sourceRun?.id ?? null,
        status: runStatus,
        fetchedCount,
        createdLeadCount,
        updatedLeadCount,
        duplicateCount,
        failedSourceCount,
        createdCatalogCount,
        updatedCatalogCount,
        discoveredPageCount,
        discoveredProductCount,
        trackedPdfCount,
        queuedDocumentJobCount,
        documentWorker,
        requiresHumanReview: true,
      },
    },
    succeeded ? 200 : 502,
  );
});
