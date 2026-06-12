import {
  BarChart3,
  BellRing,
  Bot,
  BrainCircuit,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  FileText,
  FolderArchive,
  Handshake,
  LayoutDashboard,
  PackageSearch,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  group: "核心" | "AI" | "协同" | "管理";
};

export const navigationItems: NavigationItem[] = [
  { title: "首页总览", href: "/dashboard", icon: LayoutDashboard, group: "核心" },
  { title: "设备价格库", href: "/equipment-prices", icon: Database, group: "核心" },
  { title: "地材价格库", href: "/material-prices", icon: PackageSearch, group: "核心" },
  { title: "供应商库", href: "/suppliers", icon: Building2, group: "核心" },
  { title: "AI报价识别", href: "/ai-quote-recognition", icon: BrainCircuit, group: "AI" },
  { title: "待审核报价", href: "/pending-quotes", icon: ClipboardCheck, group: "AI" },
  { title: "AI价格采集", href: "/ai-price-collection", icon: Sparkles, group: "AI" },
  { title: "价格线索池", href: "/price-leads", icon: BellRing, group: "AI" },
  { title: "询价管理", href: "/inquiries", icon: Handshake, group: "协同" },
  { title: "项目套价", href: "/project-pricing", icon: ChartNoAxesCombined, group: "协同" },
  { title: "附件证据库", href: "/attachments", icon: FolderArchive, group: "协同" },
  { title: "统计分析", href: "/analytics", icon: BarChart3, group: "管理" },
  { title: "AI工作台", href: "/ai-workbench", icon: Bot, group: "管理" },
  { title: "AI报告中心", href: "/ai-report-center", icon: FileText, group: "管理" },
  { title: "系统设置", href: "/settings", icon: Settings, group: "管理" },
];

export const navigationGroups = ["核心", "AI", "协同", "管理"] as const;
