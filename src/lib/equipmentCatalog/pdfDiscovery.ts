type PdfDiscovery = {
  url: string;
  title: string;
  language: string;
  metadata: Record<string, unknown>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractAssignedJson(body: string, marker: string) {
  const markerIndex = body.indexOf(marker);
  if (markerIndex < 0) return null;
  const startIndex = body.indexOf("{", markerIndex + marker.length);
  if (startIndex < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = startIndex; index < body.length; index += 1) {
    const character = body[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(body.slice(startIndex, index + 1)) as unknown;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function discoverKsbPdfs(body: string) {
  const states = [
    extractAssignedJson(body, "window.__QUERY_STATE__"),
    extractAssignedJson(body, "window.__PRELOADED_STATE__"),
  ].filter(Boolean);
  if (!states.length) return [] as PdfDiscovery[];
  const documents: Array<Record<string, unknown>> = [];
  const visit = (value: unknown, depth = 0) => {
    if (depth > 16 || documents.length >= 500) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    if (
      text(row.application).toUpperCase() === "PDF" &&
      text(row.checksum) &&
      text(row.documentNumber)
    ) documents.push(row);
    Object.values(row).forEach((child) => visit(child, depth + 1));
  };
  states.forEach((state) => visit(state));

  documents.sort((left, right) => {
    const rank = (document: Record<string, unknown>) => {
      const language = text(object(document.language).isocode).toLowerCase();
      return language.startsWith("zh") ? 0 : language === "en" ? 1 : 2;
    };
    return rank(left) - rank(right);
  });

  const results = new Map<string, PdfDiscovery>();
  for (const document of documents) {
    const language = object(document.language);
    const params = new URLSearchParams({
      application: "PDF",
      checksum: text(document.checksum),
      documentNumber: text(document.documentNumber),
      documentPart: text(document.documentPart),
      documentType: text(document.documentType),
      documentVersion: text(document.documentVersion),
      extension: text(document.fileExtension || "PDF"),
      mimetype: text(document.mimeType || "application/pdf"),
      salesOrg: "5101",
    });
    const url = `https://live-commerce-proxy-e2e-sales.ksb.com/rest/v2/ksb/users/anonymous/odata/disfile?${params}`;
    results.set(url, {
      url,
      title:
        [
          text(document.name || document.description) || "KSB 技术文档",
          text(language.nativeName || language.name),
          text(document.documentNumber),
        ]
          .filter(Boolean)
          .join(" · "),
      language: text(language.isocode) || "zh-CN",
      metadata: {
        discoveryMethod: "ksb_query_state",
        documentNumber: text(document.documentNumber),
        documentType: text(document.documentType),
        documentVersion: text(document.documentVersion),
        checksum: text(document.checksum),
        fileSize: number(document.fileSize),
        fileSizeUnit: text(document.fileSizeUnit),
      },
    });
  }
  return Array.from(results.values());
}

function discoverLinkedPdfs(body: string, pageUrl: URL) {
  const results = new Map<string, PdfDiscovery>();
  for (const match of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(decodeHtml(match[1]), pageUrl);
      if (url.protocol !== "https:") continue;
      if (!/\.pdf(?:$|[?#])/i.test(`${url.pathname}${url.search}`)) continue;
      const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      results.set(url.toString(), {
        url: url.toString(),
        title: title || "官网技术文档",
        language: "zh-CN",
        metadata: { discoveryMethod: "official_page_link" },
      });
    } catch {
      // Ignore malformed and non-HTTP links.
    }
  }
  return Array.from(results.values());
}

export function discoverOfficialPdfs(body: string, pageUrl: URL, brand: string) {
  const discovered = new Map<string, PdfDiscovery>();
  discoverLinkedPdfs(body, pageUrl).forEach((item) => discovered.set(item.url, item));
  if (brand.trim().toUpperCase() === "KSB" || pageUrl.hostname.endsWith("ksb.com")) {
    discoverKsbPdfs(body).forEach((item) => discovered.set(item.url, item));
  }
  return Array.from(discovered.values());
}

function normalizeMatchText(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

export function matchOfficialPdfsToCatalog(
  pdfs: PdfDiscovery[],
  catalog: {
    brand?: string | null;
    equipmentName?: string | null;
    model?: string | null;
    productSeries?: string | null;
    productFamily?: string | null;
  },
) {
  if (text(catalog.brand).toUpperCase() !== "KSB") return pdfs;
  const exactKeys = [catalog.model, catalog.productSeries, catalog.productFamily]
    .map(normalizeMatchText)
    .filter((value) => value.length >= 4);
  const equipmentName = normalizeMatchText(catalog.equipmentName);
  return pdfs.filter((pdf) => {
    const searchable = normalizeMatchText([
      pdf.title,
      pdf.url,
      pdf.metadata.documentNumber,
      pdf.metadata.productName,
      pdf.metadata.series,
      pdf.metadata.model,
    ].map(text).join(" "));
    if (exactKeys.some((key) => searchable.includes(key))) return true;
    return equipmentName.length >= 6 && searchable.includes(equipmentName);
  });
}

export function isAllowedOfficialUrl(candidate: string, pageUrl: URL) {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return false;
    const pageHost = pageUrl.hostname.toLowerCase();
    const candidateHost = url.hostname.toLowerCase();
    if (pageHost.endsWith("ksb.com")) return candidateHost.endsWith("ksb.com");
    return candidateHost === pageHost;
  } catch {
    return false;
  }
}

export async function fetchOfficialPageForDocuments(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("产品来源必须使用 HTTPS");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(url.hostname)) {
    throw new Error("不允许访问内部网络地址");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "WPI-Equipment-Document-Discovery/1.0",
      },
    });
    if (!response.ok) throw new Error(`官网返回 HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) throw new Error("产品来源不是可解析的网页");
    return { body: (await response.text()).slice(0, 4_000_000), url: new URL(response.url) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyOfficialPdf(value: string, pageUrl: URL) {
  if (!isAllowedOfficialUrl(value, pageUrl)) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(value, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "application/pdf",
        Range: "bytes=0-31",
        "User-Agent": "WPI-Equipment-Document-Discovery/1.0",
      },
    });
    if (!response.ok || !isAllowedOfficialUrl(response.url, pageUrl)) return false;
    const reader = response.body?.getReader();
    const first = await reader?.read();
    await reader?.cancel();
    const signature = first?.value ? new TextDecoder().decode(first.value.slice(0, 5)) : "";
    return (response.headers.get("content-type") || "").toLowerCase().includes("application/pdf") || signature === "%PDF-";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
