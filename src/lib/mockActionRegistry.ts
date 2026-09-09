"use client";

export type MockActionKind =
  | "ai"
  | "back"
  | "confirm"
  | "detail"
  | "edit"
  | "export"
  | "menu"
  | "pagination"
  | "reset"
  | "search"
  | "upload"
  | "none";

const appRoutePrefixes = [
  "/dashboard",
  "/equipment-prices",
  "/material-prices",
  "/suppliers",
  "/ai-quote-recognition",
  "/pending-quotes",
  "/ai-price-collection",
  "/price-leads",
  "/inquiries",
  "/comparisons",
  "/project-pricing",
  "/ai-inquiry-letter",
  "/ai-workbench",
  "/ai-report-center",
  "/attachments",
  "/reports",
  "/analytics",
  "/settings",
];

export function compactActionText(text: string) {
  return text.replace(/\s+/g, "");
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isInternalAppHref(href: string) {
  return appRoutePrefixes.some((prefix) => href === prefix || href.startsWith(`${prefix}/`) || href.startsWith(`${prefix}?`));
}

export function shouldPreferNativeHref(href: string) {
  if (!href || href === "#" || href.startsWith("javascript:")) {
    return false;
  }

  if (/^(https?:|mailto:|tel:)/.test(href)) {
    return false;
  }

  return isInternalAppHref(href);
}

export function allowScopedRouteInference(text: string) {
  return hasAny(text, ["查看", "详情", "处理", "复核", "继续", "进入"]) && !hasAny(text, ["更多", "操作"]);
}

export function classifyMockAction(rawText: string): MockActionKind {
  const text = compactActionText(rawText);

  if (!text) return "none";
  if (text.includes("返回")) return "back";
  if (hasAny(text, ["上传", "导入", "选择文件"])) return "upload";
  if (hasAny(text, ["导出", "下载"])) return "export";
  if (hasAny(text, ["编辑", "修正", "补充资料", "补全字段", "去重合并"])) return "edit";
  if (hasAny(text, ["删除", "作废", "重置密钥", "驳回"])) return "confirm";
  if (hasAny(text, ["更多", "操作菜单"])) return "menu";
  if (hasAny(text, ["查询", "搜索"])) return "search";
  if (hasAny(text, ["重置", "清空", "恢复默认"])) return "reset";
  if (/^\d+$/.test(text) || hasAny(text, ["上一页", "下一页"])) return "pagination";
  if (
    hasAny(text, [
      "AI",
      "智能",
      "识别",
      "采集",
      "推荐",
      "评估",
      "分析",
      "生成",
      "解析",
      "补全",
      "套价",
      "比价",
      "重新",
      "批量审核",
      "自动套价",
    ])
  ) {
    return "ai";
  }
  if (hasAny(text, ["查看", "详情"])) return "detail";

  return "none";
}
