import { prisma } from "@/lib/db";

export async function hasActiveSub(userId: string): Promise<boolean> {
  // MVP policy: treat ACTIVE/TRIALING/PAST_DUE as usable
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE","TRIALING","PAST_DUE"] } },
  });
  return !!sub;
}
