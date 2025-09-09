import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredLockMinutes: true },
  });
  return Response.json({ preferredLockMinutes: fresh?.preferredLockMinutes ?? 60 });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { minutes } = await req.json();
  const m = Math.max(1, Math.min(7 * 24 * 60, Number(minutes) || 60));
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { preferredLockMinutes: m },
    select: { preferredLockMinutes: true },
  });
  return Response.json({ preferredLockMinutes: updated.preferredLockMinutes });
}
