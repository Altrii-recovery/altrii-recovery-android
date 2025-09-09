import { prisma } from "./db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** Resolve the authenticated user from NextAuth session. Returns null if unauthenticated. */
export async function requireUser(_req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.uid || (session?.user as any)?.id || null;
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  return user;
}
