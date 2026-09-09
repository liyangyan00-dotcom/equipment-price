import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "水务智采 · AI 价格情报与成本决策平台",
  icons: { icon: "/brand/shuiwu-zhicai.png", apple: "/brand/shuiwu-zhicai.png" },
  description: "面向水务工程的设备与材料价格情报、询价比价和项目成本测算平台，以 AI 辅助分析和人工复核支持商务决策。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
