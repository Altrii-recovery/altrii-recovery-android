import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(_req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  return Response.json(device);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const iso: string = String(body?.lockUntil || "");
  const date = iso ? new Date(iso) : null;

  const device = await prisma.device.findFirst({ where: { id: params.id, userId: user.id } });
  if (!device) return new Response("Not found", { status: 404 });

  const updated = await prisma.device.update({
    where: { id: params.id },
    data: { lockUntil: date },
    include: { settings: true },
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  const locked = !!(device.lockUntil && device.lockUntil > new Date());
  if (locked) return new Response("Device is locked and cannot be deleted", { status: 400 });

  await prisma.deviceSettings.deleteMany({ where: { deviceId: device.id } }).catch(() => {});
  await prisma.device.delete({ where: { id: device.id } });

  return new Response(null, { status: 204 });
}
