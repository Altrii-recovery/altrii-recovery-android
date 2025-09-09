import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  // Allow stateless testing (DEV_USER_ID) or real session
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string | null; email?: string | null } | undefined;
  const userId = user?.id ?? user?.email ?? process.env.DEV_USER_ID ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Minimal stub rules — we’ll replace with real categories later
  const rules = {
    deviceId: params.id,
    version: 1,
    updatedAt: new Date().toISOString(),
    // Simple domain list to prove the flow; expand later
    blockedDomains: [
      "example.com",
      "pornhub.com",
      "xvideos.com",
      "bet365.com",
      "twitter.com",
      "tiktok.com",
      "instagram.com",
      "youtube.com"   // we’ll refine per-app later
    ]
  };

  return NextResponse.json(rules);
}
