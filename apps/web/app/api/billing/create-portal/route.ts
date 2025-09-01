import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const u = await prisma.user.findUnique({ where: { id: user.id } });
  if (!u?.stripeCustomerId) return new Response("No Stripe customer", { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const portal = await stripe.billingPortal.sessions.create({
    customer: u.stripeCustomerId,
    return_url: process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL!,
  });
  return Response.json({ url: portal.url });
}
