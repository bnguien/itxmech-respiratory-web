import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/auth";

const protectedPagePrefixes = [
  "/dashboard",
  "/patients",
  "/recordings",
  "/alerts",
  "/devices",
  "/settings",
];

const publicApiRoutes = new Set([
  "/api/docs",
  "/api/openapi.json",
  "/api/health",
]);

// Patient handlers perform their own authenticated doctor check. Letting them
// pass through avoids verifying the same Supabase token twice per request.
const selfAuthenticatedApiPrefixes = ["/api/patients"];

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function safeNextPath(request: NextRequest) {
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) =>
    redirectResponse.cookies.set(cookie),
  );
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  if (publicApiRoutes.has(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  if (
    selfAuthenticatedApiPrefixes.some(
      (prefix) =>
        request.nextUrl.pathname === prefix ||
        request.nextUrl.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && isApiRoute) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để thực hiện yêu cầu này." },
      { status: 401 },
    );
  }

  if (!user && isProtectedPage(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNextPath(request));
    return redirectWithSession(loginUrl, response);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    return redirectWithSession(new URL("/dashboard", request.url), response);
  }

  if (pathname === "/") {
    return redirectWithSession(
      new URL(user ? "/dashboard" : "/login", request.url),
      response,
    );
  }

  return response;
}
