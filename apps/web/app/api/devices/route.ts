import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";
import { hasActiveSub } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { registeredAt: "desc" },
    include: { settings: true },
  });
  return Response.json(devices);
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Require subscription to add devices (adjust if you prefer soft gate)
  const ok = await hasActiveSub(user.id);
  if (!ok) return new Response("Subscription required", { status: 402 });

  // Enforce max 3 devices
  const count = await prisma.device.count({ where: { userId: user.id } });
  if (count >= 3) return new Response("Device limit reached (3)", { status: 403 });

  const body = await req.json();
  const name: string = String(body?.name || "").trim();
  const platform = String(body?.platform || "ANDROID").toUpperCase();

  if (!name) return new Response("Missing name", { status: 400 });

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name,
      platform: platform as any,
      settings: {
        create: {
          blockAdult: true,
          blockGambling: true,
          blockSocial: false,
          blockYouTube: false,
          blockVPN: true,
          rulesVersion: 1,
        },
      },
    },
    include: { settings: true },
  });

  return Response.json(device, { status: 201 });
}
