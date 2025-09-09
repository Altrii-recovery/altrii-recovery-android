import { auth } from "@/lib/auth-lite";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.deviceSettings.findFirst({
    where: { deviceId: params.id, device: { userId: session.user.id } },
  });
  if (!settings) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(settings);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Ensure the device belongs to the user
  const dev = await prisma.device.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!dev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.deviceSettings.upsert({
    where: { deviceId: params.id },
    create: { deviceId: params.id, ...body },
    update: body,
  });
  return NextResponse.json(updated);
}
