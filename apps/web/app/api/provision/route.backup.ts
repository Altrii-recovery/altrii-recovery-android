import { NextResponse } from "next/server";
import { z } from "zod";
import { signProvisioningToken } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const Body = z.object({
  deviceSerial: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const sUser = session?.user as { id?: string | null; email?: string | null } | undefined;
  const userId = sUser?.id ?? sUser?.email ?? process.env.DEV_USER_ID ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const device = await prisma.device.upsert({
    where: { ownerId_serial: { ownerId: userId, serial: body.data.deviceSerial ?? "unknown" } },
    update: { model: body.data.model ?? undefined },
    create: { ownerId: userId, serial: body.data.deviceSerial ?? "unknown", model: body.data.model ?? null },
    select: { id: true },
  });

  const token = await signProvisioningToken({
    deviceId: device.id,
    ownerId: userId,
    aud: "altrii-device",
    expSeconds: 10 * 60,
  });

  const qrPayload = JSON.stringify({ scheme: "altrii://provision", token });
  return NextResponse.json({ token, qrPayload });
}
