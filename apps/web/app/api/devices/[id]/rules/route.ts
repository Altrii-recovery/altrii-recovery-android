import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

// Placeholder lists; replace later with curated sets.
const ADULT = ["example-adult.com", "nsfw.example"];
const GAMBLING = ["bet.example", "casino.example"];
const SOCIAL = ["twitter.com", "x.com", "instagram.com", "reddit.com"];
const YOUTUBE = ["youtube.com", "ytimg.com", "googlevideo.com"];
const VPN = ["vpn.example", "openvpn.net", "protonvpn.com", "nordvpn.com"];

export async function GET(req: Request, { params }: { params: { id: string }}) {
  const user = await requireUser(req);
  const dev = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!dev || !dev.settings) return new Response("Not found", { status: 404 });

  const s = dev.settings;
  const blocked = new Set<string>();
  if (s.blockAdult) ADULT.forEach(d => blocked.add(d));
  if (s.blockGambling) GAMBLING.forEach(d => blocked.add(d));
  if (s.blockSocial) SOCIAL.forEach(d => blocked.add(d));
  if (s.blockYouTube) YOUTUBE.forEach(d => blocked.add(d));
  if (s.blockVPN) VPN.forEach(d => blocked.add(d));

  return Response.json({
    deviceId: dev.id,
    version: s.rulesVersion,
    generatedAt: new Date().toISOString(),
    policy: { defaultQUIC: "block", defaultUnknownSNI: "block" },
    blockedDomains: Array.from(blocked).sort(),
    allowedDomains: [],
  });
}
