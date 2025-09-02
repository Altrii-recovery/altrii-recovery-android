import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function PostAuthPage({
  searchParams,
}: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(authOptions as any);
  const uid = (session as any)?.uid;
  if (!uid) return redirect("/auth/signup");

  // If coming back from Stripe checkout, force a refresh of subscription from Stripe
  const fromCheckout = searchParams?.checkout === "success";
  if (fromCheckout) {
    try {
      // Server-side fetch includes cookies; no-store to avoid caching
      await fetch(`${process.env.APP_URL || ""}/api/billing/refresh`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    } catch {}

    // slight delay is sometimes helpful, but optional
    // await new Promise(r => setTimeout(r, 300));
  }

  const hasSub = await prisma.subscription.findFirst({
    where: { userId: String(uid), status: { in: ["ACTIVE","TRIALING","PAST_DUE"] } },
    select: { id: true },
  });

  if (hasSub) {
    return redirect("/dashboard/devices");
  } else {
    return redirect("/dashboard/billing");
  }
}
