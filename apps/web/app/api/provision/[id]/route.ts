import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function GET(req: Request, { params }: { params: { id: string }}) {
  const user = await requireUser(req);
  const dev = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!dev) return new Response("Not found", { status: 404 });

  const payload = {
    sub: dev.id,
    uid: user.id,
    scp: ["rules:read", "telemetry:write"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
  };
  const token = jwt.sign(payload, process.env.APP_SECRET || "dev", {
    algorithm: "HS256",
  });
  return Response.json({ deviceId: dev.id, token });
}
