import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-lite";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const { plan } = await req.json();

  const priceId = {
    monthly: process.env.STRIPE_PRICE_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_QUARTERLY!,
    semiannual: process.env.STRIPE_PRICE_SEMIANNUAL!,
    annual: process.env.STRIPE_PRICE_ANNUAL!,
  }[String(plan).toLowerCase() as "monthly"|"quarterly"|"semiannual"|"annual"];

  if (!priceId) {
    return new Response("Invalid plan", { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

  // Ensure Stripe customer
  let customerId = user.stripeCustomerId || undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${process.env.APP_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${process.env.APP_URL}/dashboard/billing?checkout=cancelled`,
  });

  return Response.json({ url: session.url });
}
