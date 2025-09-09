import { prisma } from "@/lib/db";

export async function hasActiveSub(userId: string): Promise<boolean> {
  // Treat ACTIVE/TRIALING/PAST_DUE as "can use the app" for MVP; adjust if needed
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
  });
  return !!sub;
}
