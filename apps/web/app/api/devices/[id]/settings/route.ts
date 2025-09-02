import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  // Block edits if locked
  const locked = !!(device.lockUntil && device.lockUntil > new Date());
  if (locked) return new Response("Device is locked; settings cannot be changed", { status: 400 });

  const updated = await prisma.deviceSettings.upsert({
    where: { deviceId: device.id },
    update: {
      blockAdult: !!body.blockAdult,
      blockGambling: !!body.blockGambling,
      blockSocial: !!body.blockSocial,
      blockYouTube: !!body.blockYouTube,
      blockVPN: !!body.blockVPN,
      rulesVersion: typeof body.rulesVersion === "number" ? body.rulesVersion : (device.settings?.rulesVersion ?? 1),
    },
    create: {
      deviceId: device.id,
      blockAdult: !!body.blockAdult,
      blockGambling: !!body.blockGambling,
      blockSocial: !!body.blockSocial,
      blockYouTube: !!body.blockYouTube,
      blockVPN: !!body.blockVPN,
      rulesVersion: typeof body.rulesVersion === "number" ? body.rulesVersion : 1,
    },
  });

  return Response.json(updated);
}
