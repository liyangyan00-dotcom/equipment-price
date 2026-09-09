import { Suspense, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { AiPriceWorkflowNav } from "@/components/ai-workflow/AiPriceWorkflowNav";
import { ToastViewport } from "@/components/common/Toast";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-page text-textMain">
      <Suspense fallback={<aside className="fixed inset-y-0 left-0 z-30 w-sidebar bg-gradient-to-b from-primary-deep to-primary-navy shadow-sidebar" />}>
        <AppSidebar />
      </Suspense>
      <div className="min-h-screen min-w-0 pl-sidebar transition-[padding-left] duration-200">
        <AppTopbar />
        <main className="min-w-0 overflow-x-clip px-page py-page">
          <Suspense fallback={null}>
            <AiPriceWorkflowNav />
          </Suspense>
          {children}
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
