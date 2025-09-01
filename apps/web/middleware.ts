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
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthed = Boolean((token as any)?.uid);

  if (!isAuthed) {
    const url = req.nextUrl.clone(); url.pathname = "/auth/signup"; return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard/billing") || pathname.startsWith("/api/billing")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!api/stripe/webhook).*)"] };
