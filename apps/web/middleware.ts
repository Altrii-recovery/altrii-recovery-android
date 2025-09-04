import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow API, Next.js assets, favicon, and auth pages
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // Add any page-only guards here (e.g., require auth for /dashboard)
  return NextResponse.next();
}

// IMPORTANT: exclude API/static/auth so middleware doesn't run for them
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
