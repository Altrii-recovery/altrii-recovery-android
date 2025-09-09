import { auth } from "@/lib/auth-lite";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { settings: true },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(device);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const updated = await prisma.device.updateMany({
    where: { id: params.id, userId: session.user.id },
    data,
  });
  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await prisma.device.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
