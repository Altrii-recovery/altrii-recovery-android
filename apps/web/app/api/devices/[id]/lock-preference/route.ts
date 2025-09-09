import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Public endpoint for client app to read owner's preferred lock minutes.
  const device = await prisma.device.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!device) return new Response("Not found", { status: 404 });
  const minutes = (device.user as any)?.preferredLockMinutes ?? 60;
  return Response.json({ preferredLockMinutes: minutes });
}
