import type { MaterialPriceRecord } from "@/data/mock/materialPrices";

export function materialDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export function materialDateInRange(value: unknown, from: string, to: string) {
  if (!from && !to) return true;
  const date = materialDate(value);
  if (!date || (from && !materialDate(from)) || (to && !materialDate(to))) return false;
  return (!from || date >= from) && (!to || date <= to);
}

function quotationCutoff(now: Date) {
  // Quote dates are calendar dates; use the system's Beijing business day.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function recentlyUpdated(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime()
    && timestamp >= now.getTime() - 30 * 86400000;
}

export function materialFacets(records: MaterialPriceRecord[], key: "category" | "region" | "unit" | "source") {
  return [...new Set(records.map(row => row[key]?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function distribution(records: MaterialPriceRecord[], key: "source" | "region") {
  const counts = new Map<string, number>();
  for (const record of records) {
    const label = record[key]?.trim() || "未提供";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"));
}

export function materialIssues(row: MaterialPriceRecord, now = new Date()) {
  const issues: string[] = [];
  if (!materialDate(row.quoteDate)) issues.push("报价日期缺失或异常");
  else if (row.quoteDate > quotationCutoff(now)) issues.push("未来报价日期待复核");
  if (!row.specification?.trim()) issues.push("规格待补充");
  if (!row.region?.trim()) issues.push("地区待补充");
  if (!row.unit?.trim()) issues.push("单位待补充");
  if (!Number.isFinite(row.originalPrice) || row.originalPrice <= 0) issues.push("价格异常");
  if (row.riskLevel === "high" || row.riskLevel === "critical") issues.push("高风险待复核");
  if (row.reviewStatus === "pending" || row.reviewStatus === "need_info") issues.push("待人工审核");
  return issues;
}

// Never mix specifications, currencies, price terms, suppliers or regions into a trend.
function comparableKey(row: MaterialPriceRecord, cutoff: string) {
  const fields = [row.materialName, row.specification, row.unit, row.currency, row.region, row.source, row.supplierName, row.transportCondition];
  if (fields.some(value => !value?.trim() || /待补充|未知|未提供/.test(value))) return null;
  if (typeof row.taxIncluded !== "boolean") return null;
  if (row.reviewStatus !== "confirmed" || !materialDate(row.quoteDate) || row.quoteDate > cutoff
    || !Number.isFinite(row.originalPrice) || row.originalPrice <= 0) return null;
  return JSON.stringify([...fields.map(value => value.trim()), row.taxIncluded]);
}

export function materialTrend(records: MaterialPriceRecord[], active?: MaterialPriceRecord, now = new Date()) {
  const cutoff = quotationCutoff(now);
  const key = active ? comparableKey(active, cutoff) : null;
  if (!key) return [];
  const dates = new Map<string, number[]>();
  for (const row of records) {
    if (comparableKey(row, cutoff) !== key) continue;
    const amounts = dates.get(row.quoteDate) ?? [];
    amounts.push(row.originalPrice);
    dates.set(row.quoteDate, amounts);
  }
  return [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, amounts]) => {
    amounts.sort((a, b) => a - b);
    const middle = Math.floor(amounts.length / 2);
    const price = amounts.length % 2 ? amounts[middle] : (amounts[middle - 1] + amounts[middle]) / 2;
    return { date, price, count: amounts.length };
  });
}

export function materialInsights(records: MaterialPriceRecord[], now = new Date()) {
  const issues = records.map(row => ({ row, issues: materialIssues(row, now) })).filter(item => item.issues.length);
  return {
    sources: distribution(records, "source"),
    regions: distribution(records, "region"),
    issues,
    highRisk: records.filter(row => row.riskLevel === "high" || row.riskLevel === "critical").length,
    unknownDate: records.filter(row => !materialDate(row.quoteDate)).length,
    futureDate: records.filter(row => materialDate(row.quoteDate) && row.quoteDate > quotationCutoff(now)).length,
  };
}
