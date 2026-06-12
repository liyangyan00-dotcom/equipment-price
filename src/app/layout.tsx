import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "水厂价格情报系统",
  description: "水厂项目机电设备与地材价格信息库初始化骨架",
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
