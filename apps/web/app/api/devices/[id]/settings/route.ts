import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  return Response.json(device.settings || null);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    include: { settings: true },
  });
  if (!device) return new Response("Not found", { status: 404 });

  const body = await req.json();

  const updated = await prisma.deviceSettings.upsert({
    where: { deviceId: device.id },
    update: {
      blockAdult: body.blockAdult ?? device.settings?.blockAdult ?? true,
      blockGambling: body.blockGambling ?? device.settings?.blockGambling ?? true,
      blockSocial: body.blockSocial ?? device.settings?.blockSocial ?? false,
      blockYouTube: body.blockYouTube ?? device.settings?.blockYouTube ?? false,
      blockVPN: body.blockVPN ?? device.settings?.blockVPN ?? true,
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
