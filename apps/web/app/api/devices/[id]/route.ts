import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findUnique({
    where: { id: params.id },
  });

  if (!device || device.userId !== user.id) {
    return new Response("Not found", { status: 404 });
  }

  if (device.lockUntil && device.lockUntil > new Date()) {
    return new Response("Device is locked and cannot be deleted", { status: 400 });
  }

  await prisma.device.delete({ where: { id: params.id } });

  return new Response("Deleted", { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { lockUntil } = await req.json();

  const device = await prisma.device.findUnique({
    where: { id: params.id },
  });

  if (!device || device.userId !== user.id) {
    return new Response("Not found", { status: 404 });
  }

  const updated = await prisma.device.update({
    where: { id: params.id },
    data: { lockUntil: lockUntil ? new Date(lockUntil) : null },
  });

  return Response.json(updated);
}
