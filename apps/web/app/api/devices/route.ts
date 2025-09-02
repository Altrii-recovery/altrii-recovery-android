import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { registeredAt: "desc" },
    include: { settings: true },
  });
  return Response.json(devices);
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { platform, name } = await req.json().catch(() => ({}));
  if (!name) return new Response("Device name is required", { status: 400 });
  if (!platform) return new Response("Platform is required", { status: 400 });

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      platform,
      name,
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

  return Response.json(device);
}
