import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, getSupabasePublicConfig } from "./config";
import { configurationGuard } from "../auth/configurationGuard";

const publicRoutes = ["/login", "/auth/confirm", "/quote-response", "/api/public/quote-response"];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
  const unavailable = configurationGuard({
    configured: isSupabaseConfigured(),
    production: process.env.NODE_ENV === "production",
    api: request.nextUrl.pathname.startsWith("/api/"),
  });
  if (unavailable) return unavailable;
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const config = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!authenticated && !isPublicRoute(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_SESSION_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
