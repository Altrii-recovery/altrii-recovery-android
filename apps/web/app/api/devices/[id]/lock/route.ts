import { NextResponse } from "next/server";
import { z } from "zod";
import { signLockToken } from "@/lib/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const Body = z.object({
  lockUntil: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(7 * 24 * 60).optional(),
  reason: z.string().optional(),
});

interface Params { params: { id: string } }

function getUserId(session: any): string | null {
  const sUser = session?.user as { id?: string | null; email?: string | null } | undefined;
  return sUser?.id ?? sUser?.email ?? process.env.DEV_USER_ID ?? null;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized (no session and no DEV_USER_ID)" }, { status: 401 });
    }

    const body = Body.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    const deviceId = params.id;
    const now = new Date();
    const until = body.data.lockUntil ? new Date(body.data.lockUntil)
      : new Date(now.getTime() + (body.data.durationMinutes ?? 60) * 60 * 1000);

    const token = await signLockToken({
      deviceId,
      ownerId: userId,
      aud: "altrii-device",
      lockUntil: Math.floor(until.getTime() / 1000),
      issuedAtServer: Math.floor(now.getTime() / 1000),
    });

    return NextResponse.json({ token, lockUntil: until.toISOString() }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error in /api/devices/[id]/lock", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
