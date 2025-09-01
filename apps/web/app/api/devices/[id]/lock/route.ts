import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  await requireUser(req);
  const { days } = await req.json();
  const max = Number(process.env.MAX_LOCK_DAYS || 30);
  if (!Number.isInteger(days) || days < 1 || days > max) {
    return new Response("Invalid days", { status: 400 });
  }
  const until = new Date(Date.now() + days*24*60*60*1000);
  const device = await prisma.device.update({
    where: { id: params.id },
    data: { lockUntil: until },
  });
  return Response.json(device);
}
