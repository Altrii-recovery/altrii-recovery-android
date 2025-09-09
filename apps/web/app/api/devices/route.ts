import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    include: { settings: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(devices);
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { name, platform } = await req.json();
  if (!name || !platform) {
    return new Response("Missing fields", { status: 400 });
  }

  const device = await prisma.device.create({
    data: { userId: user.id, name, platform },
    include: { settings: true },
  });

  return Response.json(device, { status: 201 });
}
