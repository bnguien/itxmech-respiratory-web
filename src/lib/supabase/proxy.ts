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

const apiDocsRoutes = new Set(["/api/docs", "/api/openapi.json"]);

const publicApiRoutes = new Set(["/api/health"]);

const selfAuthenticatedApiPrefixes = [
  // App người nhà: tự kiểm tra Bearer token trong từng route (src/lib/app-api/server.ts).
  "/api/app",
  "/api/patients",
  "/api/recordings",
  "/api/visits",
  "/api/device",
];

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isApiDocsRoute(pathname: string) {
  return apiDocsRoutes.has(
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname,
  );
}

function safeNextPath(request: NextRequest) {
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  sessionResponse.cookies
    .getAll()
    .forEach((cookie) => redirectResponse.cookies.set(cookie));

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiDocsRoute(pathname)) {
    if (process.env.ENABLE_API_DOCS !== "true") {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.next({ request });
  }

  if (publicApiRoutes.has(pathname)) {
    return NextResponse.next({ request });
  }

  if (
    selfAuthenticatedApiPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
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

  const isApiRoute = pathname.startsWith("/api/");

  if (!user && isApiRoute) {
    return NextResponse.json(
      {
        error: "Bạn cần đăng nhập để thực hiện yêu cầu này.",
      },
      {
        status: 401,
      },
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
