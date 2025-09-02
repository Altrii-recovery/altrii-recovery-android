import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { platform, name } = await req.json();

  if (!name) {
    return new Response("Device name is required", { status: 400 });
  }

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      platform,
      name,
    },
  });

  return Response.json(device);
}
