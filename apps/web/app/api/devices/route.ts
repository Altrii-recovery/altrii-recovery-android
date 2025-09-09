import { auth } from "@/lib/auth-lite";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: session.user.id },
    include: { settings: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices);
}
