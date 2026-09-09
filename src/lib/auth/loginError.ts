export function loginError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message) : "";
  if (/exceed_egress_quota/i.test(message)) {
    return { restricted: true, message: "云服务出站流量额度已超限，登录暂不可用。这不是密码错误。请项目管理员在 Supabase 控制台检查用量和账单，确认恢复服务后再重试。升级套餐或取消消费上限可能产生费用。" };
  }
  if (/Service for this project is restricted/i.test(message)) {
    return { restricted: true, message: "云服务项目受到限制，登录暂不可用。请项目管理员在 Supabase 控制台检查限制原因并恢复服务。" };
  }
  if (/Invalid login credentials/i.test(message)) {
    return { restricted: false, message: "邮箱或密码不正确，请检查后重试。" };
  }
  return { restricted: false, message: message || "认证失败，请稍后重试。" };
}
