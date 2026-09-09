import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { SettingsHome } from "@/components/settings/SettingsHome";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { accessFailure } from "@/lib/auth/accessFailure";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let organization: { name: string; code: string } | null = null;
  let role = "";
  let error = "";
  let errorCode = "";
  try {
    const access = await getApiAccess();
    if (!access.ok) {
      error = access.status === 401 ? "登录已失效，请重新登录。" : access.error;
      errorCode = access.status === 401 ? "unauthorized" : ("code" in access ? String(access.code) : "unavailable");
    } else {
      const result = await access.supabase.from("wpi_organizations").select("name,code").eq("id", access.organizationId).maybeSingle();
      if (result.error) {
        const failure = accessFailure(result.error);
        error = failure.error; errorCode = failure.code;
      } else if (!result.data) {
        error = "工作组资料不可用，请管理员核查组织记录。"; errorCode = "unavailable";
      } else { organization = result.data; role = access.role; }
    }
  } catch {
    error = "暂时无法连接云服务，请稍后重试。"; errorCode = "unavailable";
  }
  return <AppLayout><SettingsHome organization={organization} role={role} error={error} checkedAt={new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })} recovery={errorCode === "unauthorized" ? <Link href="/login?next=%2Fsettings" className="font-semibold text-primary underline">重新登录</Link> : errorCode === "restricted" ? <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">云服务控制台</a> : null} /></AppLayout>;
}
