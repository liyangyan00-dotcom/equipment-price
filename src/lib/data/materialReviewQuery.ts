export type MaterialReviewFilters = {
  keyword: string; status: string; risk: string; category: string; source: string;
  queue: "all" | "awaiting" | "highRisk" | "needsInfo" | "highConfidence" | "approved";
};

export const defaultMaterialReviewFilters: MaterialReviewFilters = {
  keyword: "", status: "all", risk: "all", category: "all", source: "all", queue: "all",
};

export { postgrestLiteral, literalSearch } from "@/lib/data/postgrestSearch";

export function materialReviewParams(params: URLSearchParams) {
  const page = params.get("page") ?? "1";
  const pageSize = params.get("pageSize") ?? "10";
  if (!/^[1-9]\d{0,5}$/.test(page) || !["10", "20", "50", "100"].includes(pageSize)) throw new Error("分页参数无效");
  const filters = { ...defaultMaterialReviewFilters };
  for (const key of Object.keys(filters) as (keyof MaterialReviewFilters)[]) {
    const value = params.get(key)?.trim();
    if (value !== undefined && value !== null) Object.assign(filters, { [key]: value });
    if (filters[key].length > 160 || /[\u0000-\u001f]/.test(filters[key])) throw new Error("筛选条件过长或包含控制字符");
  }
  if (!["all","draft","pending_review","approved","rejected","archived"].includes(filters.status)
    || !["all","low","medium","high","critical"].includes(filters.risk)
    || !["all","awaiting","highRisk","needsInfo","highConfidence","approved"].includes(filters.queue)) throw new Error("筛选条件无效");
  const ids = [...new Set((params.get("materialIds") ?? "").split(",").map(value => value.trim()).filter(Boolean))];
  if (ids.length > 100 || ids.some(value => value.length > 100 || /[\u0000-\u001f]/.test(value))) throw new Error("关联记录最多100条，请缩小范围");
  return { page: Number(page), pageSize: Number(pageSize), filters, ids };
}
