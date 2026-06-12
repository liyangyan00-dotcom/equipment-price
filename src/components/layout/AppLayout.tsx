import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-page text-textMain">
      <AppSidebar />
      <div className="min-h-screen pl-sidebar">
        <AppTopbar />
        <main className="px-page py-page">{children}</main>
      </div>
    </div>
  );
}
