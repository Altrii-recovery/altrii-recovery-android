import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: Request) {
  const user = await requireUser(req);
  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    include: { settings: true },
  });
  return Response.json(devices);
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  const count = await prisma.device.count({ where: { userId: user.id } });
  const max = Number(process.env.MAX_DEVICES || 3);
  if (count >= max) return new Response("Device limit reached", { status: 400 });

  const { name, platform } = await req.json();
  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name,
      platform,
      settings: { create: {} },
    },
    include: { settings: true },
  });
  return Response.json(device);
}
