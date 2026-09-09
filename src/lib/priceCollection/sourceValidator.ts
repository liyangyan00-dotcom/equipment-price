import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const supportedContentTypes = [
  "text/html",
  "application/json",
  "text/plain",
  "application/xhtml+xml",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ipv4)) return false;
  const [a, b] = ipv4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function assertPublicHttpsUrl(rawUrl: string, allowedHosts: string[]) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("采集地址必须使用 HTTPS");
  if (url.username || url.password) throw new Error("采集地址不能包含用户名或密码");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("不能登记本地或内网地址");
  if (allowedHosts.length && !allowedHosts.includes(hostname)) throw new Error("采集地址不在允许域名中");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("不能登记私有或保留 IP 地址");
  } else {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) throw new Error("域名解析到私有、保留或不可用地址");
  }
  return url;
}

export async function verifyCollectionSource(rawUrl: string, allowedHosts: string[]) {
  let url = await assertPublicHttpsUrl(rawUrl, allowedHosts);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.2",
          "User-Agent": "WPI-Source-Validator/1.0",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("来源返回了无目标地址的重定向");
        url = await assertPublicHttpsUrl(new URL(location, url).toString(), allowedHosts);
        continue;
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      await response.body?.cancel();
      if (!response.ok) throw new Error(`来源返回 HTTP ${response.status}`);
      if (!supportedContentTypes.some((item) => contentType.includes(item))) throw new Error(`不支持的来源内容类型：${contentType || "未知"}`);
      return { url: url.toString(), contentType, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("来源重定向次数超过安全上限");
}

async function readLimitedText(response: Response, maxBytes = 1_000_000) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

export async function fetchCollectionWebsite(rawUrl: string) {
  const initial = new URL(rawUrl);
  const allowedHosts = [initial.hostname.toLowerCase()];
  let url = await assertPublicHttpsUrl(rawUrl, allowedHosts);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2",
          "User-Agent": "WPI-Manufacturer-Identity/1.0",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("官网返回了无目标地址的重定向");
        const next = new URL(location, url);
        if (next.hostname.toLowerCase() !== url.hostname.toLowerCase()) {
          allowedHosts.push(next.hostname.toLowerCase());
        }
        url = await assertPublicHttpsUrl(next.toString(), allowedHosts);
        continue;
      }
      if (!response.ok) throw new Error(`官网返回 HTTP ${response.status}`);
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        await response.body?.cancel();
        throw new Error(`官网首页不是可识别的 HTML：${contentType || "未知类型"}`);
      }
      return {
        finalUrl: url.toString(),
        hostname: url.hostname.toLowerCase(),
        contentType,
        html: await readLimitedText(response),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("官网重定向次数超过安全上限");
}
