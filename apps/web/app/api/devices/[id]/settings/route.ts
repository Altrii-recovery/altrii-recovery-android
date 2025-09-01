import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  await requireUser(req);
  const body = await req.json();
  const ds = await prisma.deviceSettings.update({
    where: { deviceId: params.id },
    data: {
      blockAdult: !!body.blockAdult,
      blockGambling: !!body.blockGambling,
      blockSocial: !!body.blockSocial,
      blockYouTube: !!body.blockYouTube,
      blockVPN: !!body.blockVPN,
      rulesVersion: { increment: 1 },
    },
  });
  return Response.json(ds);
}
