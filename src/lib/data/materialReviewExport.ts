import type { MaterialPriceApiRecord } from "@/types/materialPriceWorkflow";

type Page = { data: MaterialPriceApiRecord[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } };

// Interactive exports are bounded; never silently truncate an over-limit result.
export async function readMaterialReviewExport(
  requestUrl: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  onProgress?: (loaded: number, total: number) => void,
) {
  const url = new URL(requestUrl, "http://local.invalid");
  url.searchParams.set("pageSize", "100");
  const rows: MaterialPriceApiRecord[] = [];
  const seen = new Set<string>();
  let total: number | undefined;
  let pageCount = 1;
  for (let page = 1; page <= pageCount; page++) {
    signal.throwIfAborted();
    url.searchParams.set("page", String(page));
    const response = await fetcher(`${url.pathname}?${url.searchParams}`, { cache: "no-store", signal });
    if (!response.ok) throw new Error(response.status === 401 ? "登录已失效，导出已停止" : response.status === 403 ? "没有导出访问权限" : "导出读取失败，未生成文件");
    const payload = await response.json() as Page;
    signal.throwIfAborted();
    const p = payload.pagination;
    if (!p || !Array.isArray(payload.data) || !Number.isSafeInteger(p.total) || p.total < 0
      || p.page !== page || p.pageSize !== 100 || p.pageCount !== Math.max(1, Math.ceil(p.total / 100))) throw new Error("导出分页响应异常，未生成文件");
    if (p.total > 10000) throw new Error("筛选结果超过10000条，请缩小范围后导出；未生成截断文件");
    if (total !== undefined && total !== p.total) throw new Error("导出期间结果数量发生变化，请刷新后重试");
    total = p.total; pageCount = p.pageCount;
    if (payload.data.length !== Math.max(0, Math.min(100, total - (page - 1) * 100))) throw new Error("导出结果缺页，未生成文件");
    for (const row of payload.data) {
      if (!row || typeof row.id !== "string" || !row.id || seen.has(row.id)) throw new Error("导出结果重复或异常，请刷新后重试");
      seen.add(row.id); rows.push(row);
    }
    onProgress?.(rows.length, total);
  }
  return rows;
}
