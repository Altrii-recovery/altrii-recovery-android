import { NextResponse } from "next/server";
import { z } from "zod";
import { signLockToken } from "@/lib/jwt";
import { requireUser } from "@/lib/auth-lite";
import { prisma } from "@/lib/db";

const Body = z.object({
  lockUntil: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(7 * 24 * 60).optional(),
  reason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (!user) return new Response("Unauthorized", { status: 401 });

    const device = await prisma.device.findFirst({
      where: { id: params.id, userId: user.id },
      include: { user: true },
    });
    if (!device) return new Response("Not found", { status: 404 });

    const raw = await req.json();
    const body = Body.parse(raw);

    const now = new Date();
    const until =
      body.lockUntil
        ? new Date(body.lockUntil)
        : new Date(now.getTime() + (body.durationMinutes ?? 60) * 60 * 1000);

    const token = await signLockToken({
      deviceId: device.id,
      ownerId: device.userId,
      aud: "altrii-device",
      lockUntil: Math.floor(until.getTime() / 1000),
      issuedAtServer: Math.floor(now.getTime() / 1000),
    });

    await prisma.device.update({
      where: { id: device.id },
      data: { lockUntil: until },
    });

    return NextResponse.json({ token, lockUntil: until.toISOString() }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error in /api/devices/[id]/lock", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
