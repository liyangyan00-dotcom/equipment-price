type ConfigurationGuardInput = {
  configured: boolean;
  production: boolean;
  api: boolean;
};

// A missing production configuration must not expose the development mock UI.
export function configurationGuard(input: ConfigurationGuardInput): Response | null {
  if (input.configured || !input.production) return null;
  const headers = { "Cache-Control": "private, no-store", "Retry-After": "300" };
  const message = "服务配置尚未就绪，请联系管理员完成部署配置后重试。";
  if (input.api) {
    return Response.json({ error: message, code: "SERVICE_NOT_CONFIGURED" }, { status: 503, headers });
  }
  return new Response(message, {
    status: 503,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}
