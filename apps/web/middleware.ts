import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

const PUBLIC_PATHS = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/api/health",
  "/api/stripe/webhook",
  "/favicon.ico",
  "/_next", "/assets", "/images"
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) {
    const url = req.nextUrl.clone(); url.pathname = "/auth/signin"; return NextResponse.redirect(url);
  }

  // Allow billing pages without active sub
  if (pathname.startsWith("/dashboard/billing") || pathname.startsWith("/api/billing")) {
    return NextResponse.next();
  }

  // Require active subscription elsewhere
  const sub = await prisma.subscription.findFirst({
    where: { userId: String(token.uid), status: { in: ["ACTIVE","TRIALING","PAST_DUE"] } },
    orderBy: { updatedAt: "desc" }
  });
  if (!sub) {
    const url = req.nextUrl.clone(); url.pathname = "/dashboard/billing"; return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/stripe/webhook).*)"],
};
