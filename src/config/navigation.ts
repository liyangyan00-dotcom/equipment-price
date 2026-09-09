import {
  BarChart3,
  Bot,
  Building2,
  ChartNoAxesCombined,
  Database,
  FileText,
  FolderArchive,
  Handshake,
  LayoutDashboard,
  LibraryBig,
  PackageSearch,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  group: "工作台" | "基础数据" | "价格业务" | "分析输出" | "系统管理";
  children?: NavigationChildItem[];
  childrenLabel?: string;
  badgeKey?: NavigationBadgeKey;
};

export type NavigationChildItem = {
  title: string;
  href: string;
  match?:
    | "exact"
    | "prefix"
    | "catalog-record"
    | "catalog-collection"
    | "project-pricing-projects"
    | "project-pricing-workspace"
    | "project-pricing-pending"
    | "query-view";
  view?: "projects" | "workspace" | "review" | "gaps" | "reports";
  badgeKey?: NavigationBadgeKey;
};

export type NavigationBadgeKey =
  | "pendingPriceReviews"
  | "pendingInquiryReviews"
  | "projectPricingReviews"
  | "projectPricingGaps"
  | "projectPricingPending";

export type NavigationCounts = Record<NavigationBadgeKey, number>;

export const navigationItems: NavigationItem[] = [
  {
    title: "首页总览",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "工作台",
  },
  { title: "AI工作台", href: "/ai-workbench", icon: Bot, group: "工作台" },
  {
    title: "设备资料库",
    href: "/equipment-catalog",
    icon: LibraryBig,
    group: "基础数据",
    children: [
      {
        title: "资料采集中心",
        href: "/equipment-catalog/collection",
        match: "catalog-collection",
      },
      {
        title: "新建采集任务",
        href: "/equipment-catalog/collection/create",
        match: "exact",
      },
      {
        title: "资料审核中心",
        href: "/equipment-catalog/reviews",
        match: "prefix",
      },
      {
        title: "正式资料库",
        href: "/equipment-catalog",
        match: "catalog-record",
      },
    ],
    childrenLabel: "资料自动化流程",
  },
  {
    title: "设备价格库",
    href: "/equipment-prices",
    icon: Database,
    group: "基础数据",
  },
  {
    title: "地材价格库",
    href: "/material-prices",
    icon: PackageSearch,
    group: "基础数据",
  },
  { title: "供应商库", href: "/suppliers", icon: Building2, group: "基础数据" },
  {
    title: "附件证据库",
    href: "/attachments",
    icon: FolderArchive,
    group: "基础数据",
  },
  {
    title: "AI价格业务闭环",
    href: "/ai-price-collection",
    icon: Sparkles,
    group: "价格业务",
    childrenLabel: "采集、审核与线索沉淀",
    children: [
      { title: "价格采集", href: "/ai-price-collection", match: "prefix" },
      {
        title: "价格审核中心",
        href: "/pending-quotes",
        match: "prefix",
        badgeKey: "pendingPriceReviews",
      },
      { title: "价格线索池", href: "/price-leads", match: "prefix" },
    ],
  },
  {
    title: "项目套价",
    href: "/project-pricing?view=projects",
    icon: ChartNoAxesCombined,
    group: "价格业务",
    badgeKey: "projectPricingPending",
    children: [
      {
        title: "套价项目",
        href: "/project-pricing?view=projects",
        match: "project-pricing-projects",
      },
      {
        title: "套价工作台",
        href: "/project-pricing?view=workspace",
        match: "project-pricing-workspace",
      },
      {
        title: "套价成果",
        href: "/project-pricing?view=reports",
        match: "query-view",
        view: "reports",
      },
    ],
  },
  {
    title: "询价管理",
    href: "/inquiries",
    icon: Handshake,
    group: "价格业务",
    childrenLabel: "创建、审核与跟踪询价",
    children: [
      {
        title: "询价任务",
        href: "/inquiries",
        match: "exact",
        badgeKey: "pendingInquiryReviews",
      },
      { title: "新建询价任务", href: "/inquiries/create", match: "prefix" },
    ],
  },
  { title: "统计分析", href: "/analytics", icon: BarChart3, group: "分析输出" },
  {
    title: "AI报告中心",
    href: "/ai-report-center",
    icon: FileText,
    group: "分析输出",
  },
  { title: "系统设置", href: "/settings", icon: Settings, group: "系统管理" },
];

export const navigationGroups = [
  "工作台",
  "基础数据",
  "价格业务",
  "分析输出",
  "系统管理",
] as const;
