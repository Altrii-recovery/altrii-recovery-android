import { NextResponse } from "next/server";
import { z } from "zod";
import { signLockToken } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";
import { hasActiveSub } from "@/lib/subscription";

const Body = z.object({
  lockUntil: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(7 * 24 * 60).optional(),
  reason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (!user) return new Response("Unauthorized", { status: 401 });

    // Optional business rule: require an active (or trialing) subscription to lock
    const ok = await hasActiveSub(user.id);
    if (!ok) return new Response("Subscription required", { status: 402 });

    // Enforce ownership
    const device = await prisma.device.findFirst({
      where: { id: params.id, userId: user.id },
      include: { user: true },
    });
    if (!device) return new Response("Not found", { status: 404 });

    const body = Body.parse(await req.json());
    const now = new Date();
    const until =
      body.lockUntil ? new Date(body.lockUntil)
      : new Date(now.getTime() + (body.durationMinutes ?? 60) * 60 * 1000);

    // Update DB lock state
    await prisma.device.update({
      where: { id: device.id },
      data: { lockUntil: until },
    });

    // Issue device lock token
    const token = await signLockToken({
      deviceId: device.id,
      ownerId: device.userId,
      aud: "altrii-device",
      lockUntil: Math.floor(until.getTime() / 1000),
      issuedAtServer: Math.floor(now.getTime() / 1000),
    });

    return NextResponse.json({ token, lockUntil: until.toISOString() }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error in /api/devices/[id]/lock", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
