import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";
import { signLockToken } from "@/lib/jwt";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  return NextResponse.json(device);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const iso: string | null = body?.lockUntil ?? null;

  // Clear lock
  if (!iso) {
    const updated = await prisma.device.update({
      where: { id: device.id },
      data: { lockUntil: null },
      include: { settings: true },
    });
    return NextResponse.json({ device: updated, token: null, lockUntil: null });
  }

  // Set lock
  const until = new Date(iso);
  if (Number.isNaN(until.getTime())) {
    return new Response("Invalid lockUntil", { status: 400 });
  }
  // Optional: cap max lock window (e.g., 7 days)
  const maxMs = 7 * 24 * 60 * 60 * 1000;
  if (until.getTime() - Date.now() > maxMs) {
    return new Response("Lock exceeds maximum allowed duration", { status: 400 });
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { lockUntil: until },
    include: { settings: true },
  });

  // Issue server-signed lock token for the device client to verify & apply policy
  const token = await signLockToken({
    deviceId: updated.id,
    ownerId: updated.userId,
    aud: "altrii-device",
    lockUntil: Math.floor(until.getTime() / 1000),
    issuedAtServer: Math.floor(Date.now() / 1000),
  });

  return NextResponse.json({
    device: updated,
    token,
    lockUntil: updated.lockUntil?.toISOString() ?? null,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req as unknown as Request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  // Prevent deleting while locked
  if (device.lockUntil && device.lockUntil > new Date()) {
    return new Response("Device is locked and cannot be deleted", { status: 400 });
  }

  await prisma.deviceSettings.deleteMany({ where: { deviceId: device.id } }).catch(() => {});
  await prisma.device.delete({ where: { id: device.id } });

  return new Response(null, { status: 204 });
}
