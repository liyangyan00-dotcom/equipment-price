import Link from "next/link";
import { RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

export class SettingsRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function SettingsAccessState({ title, loading, denied, error, onRetry }: {
  title: string; loading: boolean; denied: boolean; error: string; onRetry: () => void;
}) {
  const Icon = loading ? RefreshCw : denied ? ShieldCheck : AlertTriangle;
  return <div className="space-y-4" data-no-global-interaction>
    <header className="rounded-card border border-primary/15 bg-gradient-to-r from-primary-soft to-white p-6">
      <h1 className="text-page-title font-semibold text-textMain">{title}</h1>
      <p className="mt-2 text-[14px] text-textMuted">工作组管理与访问权限</p>
    </header>
    <section role="status" className="rounded-card border border-borderSoft bg-white px-6 py-14 text-center shadow-card">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon className={`size-8 ${loading ? "animate-spin" : ""}`} /></div>
      <h2 className="mt-5 text-[20px] font-semibold text-textMain">{loading ? "正在确认访问权限" : denied ? "当前账号无管理权限" : "暂时无法读取管理数据"}</h2>
      <p className="mx-auto mt-3 max-w-xl text-[14px] leading-7 text-textSecondary">{loading ? "请稍候，正在读取工作组管理信息。" : denied ? "成员管理与角色权限配置仅对系统管理员开放。你仍可按当前角色使用价格、询价、项目等业务功能。如需管理权限，请联系工作组管理员。" : error}</p>
      {!loading && <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/settings" className="rounded-lg border border-primary/20 px-5 py-2.5 text-[14px] font-medium text-primary">返回系统设置</Link>
        <Link href="/dashboard" className="rounded-lg bg-primary px-5 py-2.5 text-[14px] font-medium text-white">返回首页</Link>
        {!denied && <button type="button" onClick={onRetry} className="rounded-lg border border-borderSoft px-5 py-2.5 text-[14px] text-textSecondary">重新加载</button>}
      </div>}
    </section>
  </div>;
}
