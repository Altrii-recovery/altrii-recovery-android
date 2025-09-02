import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("No STRIPE_SECRET_KEY");
    return new Response("stripe misconfigured", { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (!user.stripeCustomerId) {
    return Response.json({ updated: false, reason: "no_customer" });
  }

  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 5,
  });

  const preferred =
    subs.data.find(s => ["active","trialing","past_due"].includes(String(s.status))) ||
    subs.data[0];

  if (!preferred) {
    await prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: "CANCELED" as any },
    });
    return Response.json({ updated: true, status: "NONE" });
  }

  const periodEndUnix =
    (preferred as any).current_period_end ??
    (preferred as any).currentPeriodEnd ??
    0;

  const priceId =
    preferred.items?.data?.[0]?.price?.id ||
    (preferred.items?.data?.[0] as any)?.plan?.id ||
    "";

  const plan =
    priceId === process.env.STRIPE_PRICE_ANNUAL ? "ANNUAL" :
    priceId === process.env.STRIPE_PRICE_SEMIANNUAL ? "SEMIANNUAL" :
    priceId === process.env.STRIPE_PRICE_QUARTERLY ? "QUARTERLY" :
    "MONTHLY";

  await prisma.subscription.upsert({
    where: { stripeSubId: preferred.id },
    update: {
      userId: user.id,
      status: String(preferred.status || "incomplete").toUpperCase() as any,
      currentPeriodEnd: new Date(Number(periodEndUnix) * 1000),
      plan,
    },
    create: {
      stripeSubId: preferred.id,
      userId: user.id,
      status: String(preferred.status || "incomplete").toUpperCase() as any,
      currentPeriodEnd: new Date(Number(periodEndUnix) * 1000),
      plan,
    },
  });

  return Response.json({
    updated: true,
    status: String(preferred.status || "incomplete").toUpperCase(),
    plan,
  });
}
