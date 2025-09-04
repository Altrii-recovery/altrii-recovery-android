import { NextResponse } from "next/server";
import { z } from "zod";
import { signProvisioningToken } from "@/lib/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const Body = z.object({
  deviceSerial: z.string().optional(),
  model: z.string().optional(),
});

function getUserId(session: any): string | null {
  const sUser = session?.user as { id?: string | null; email?: string | null } | undefined;
  return sUser?.id ?? sUser?.email ?? process.env.DEV_USER_ID ?? null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized (no session and no DEV_USER_ID)" }, { status: 401 });
    }

    // NOTE: Skip DB; mint a deviceId now (you can later persist this if you want)
    const deviceId = crypto.randomUUID();

    const token = await signProvisioningToken({
      deviceId,
      ownerId: userId,
      aud: "altrii-device",
      expSeconds: 10 * 60,
    });

    const qrPayload = JSON.stringify({ scheme: "altrii://provision", token });
    return NextResponse.json({ token, qrPayload, deviceId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error in /api/provision", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
