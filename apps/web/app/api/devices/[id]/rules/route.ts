import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";
import { hasActiveSub } from "@/lib/subscription";
import { adult } from "@/lib/rules/adult";
import { social } from "@/lib/rules/social";
import { gambling } from "@/lib/rules/gambling";
import { youtube } from "@/lib/rules/youtube";
import { vpn } from "@/lib/rules/vpn";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require subscription to receive rules (adjust policy if needed)
  const ok = await hasActiveSub(user.id);
  if (!ok) return NextResponse.json({ error: "Subscription required" }, { status: 402 });

  // Ownership check
  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const s = device.settings;
  const blocked = new Set<string>();
  if (s?.blockAdult) adult.forEach(d => blocked.add(d));
  if (s?.blockSocial) social.forEach(d => blocked.add(d));
  if (s?.blockYouTube) youtube.forEach(d => blocked.add(d));
  if (s?.blockGambling) gambling.forEach(d => blocked.add(d));
  if (s?.blockVPN) vpn.forEach(d => blocked.add(d));

  const rules = {
    version: s?.rulesVersion ?? 1,
    blockedDomains: Array.from(blocked),
  };
  return NextResponse.json(rules);
}
