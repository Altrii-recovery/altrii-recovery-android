import { cookies, headers } from "next/headers";

/** Minimal shape + Stripe field expected by billing routes */
export type SessionUser = {
  id: string;
  email?: string | null;
  stripeCustomerId?: string | null;
};
export type Session = { user: { id: string; email?: string | null } } | null;

/**
 * Returns the current session if signed in.
 * - Tries NextAuth (if present).
 * - Falls back to x-user-id header or "uid" cookie.
 */
export async function auth(): Promise<Session> {
  try {
    // Dynamic imports safe to fail if next-auth is not installed
    // @ts-ignore
    const { getServerSession } = await import("next-auth/next");
    // @ts-ignore
    const { authOptions } = await import("./auth-options");
    const s: any = await getServerSession(authOptions as any);
    if (s && s.user && (s.user as any).id) {
      return {
        user: {
          id: (s.user as any).id as string,
          email: (s.user as any).email ?? null,
        },
      };
    }
  } catch {
    // ignore; use fallback
  }

  const h = headers();
  const uid = h.get("x-user-id") || cookies().get("uid")?.value || null;
  return uid ? { user: { id: uid, email: null } } : null;
}

/** Return hydrated user (includes stripeCustomerId) or throw */
export async function requireUser(_req?: Request): Promise<SessionUser> {
  const s = await auth();
  if (!s?.user?.id) throw new Error("UNAUTHORIZED");

  // Hydrate from Prisma so routes can access stripeCustomerId
  const { prisma } = await import("@/lib/db");
  const dbUser = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  if (!dbUser) throw new Error("UNAUTHORIZED");

  return {
    id: dbUser.id,
    email: dbUser.email ?? s.user.email ?? null,
    stripeCustomerId: dbUser.stripeCustomerId ?? null,
  };
}

/** Convenience: return just the userId string or throw */
export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}
