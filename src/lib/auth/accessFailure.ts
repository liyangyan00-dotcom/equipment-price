export function accessFailure(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const restricted = /exceed_egress_quota|Service for this project is restricted/i.test(message);
  return {
    code: restricted ? "restricted" : "unavailable",
    status: 503,
    error: restricted
      ? "云服务项目受限，暂时无法读取工作组权限。请管理员检查 Supabase 用量与账单；升级或取消消费上限可能产生费用。"
      : "暂时无法读取工作组权限，请稍后重试；若持续失败，请管理员检查云服务状态。",
  };
}
