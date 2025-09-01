import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const session = await getServerSession(authOptions as any);
  const uid = (session as any)?.uid as string | undefined;
  if (!uid) return redirect("/auth/signup");

  const hasSub = await prisma.subscription.findFirst({
    where: { userId: uid, status: { in: ["ACTIVE","TRIALING","PAST_DUE"] } },
  });

  if (hasSub) return redirect("/devices");
  return redirect("/dashboard/billing");
}
