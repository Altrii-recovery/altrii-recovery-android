import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = [
  "/auth/signin",
  "/auth/signup",
  "/api/auth",              // next-auth internal
  "/api/stripe/webhook",
  "/api/health",
  "/_next", "/favicon.ico", "/assets", "/images"
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public assets and auth pages
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthed = Boolean(token?.uid);

  // If not signed in, send to Sign Up
  if (!isAuthed) {
    const url = req.nextUrl.clone(); url.pathname = "/auth/signup"; return NextResponse.redirect(url);
  }

  // Allow billing (to let users purchase)
  if (pathname.startsWith("/dashboard/billing") || pathname.startsWith("/api/billing")) {
    return NextResponse.next();
  }

  // Everything else can proceed; /post-auth and / devices redirect logic handled in pages
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api/stripe/webhook).*)"] };
