import Stripe from "stripe";
import { prisma } from "@/lib/db";

// Ensure Node runtime so we can read raw body
export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription" && s.customer && s.subscription) {
        const customerId = typeof s.customer === "string" ? s.customer : s.customer.id;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;

        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (user) {
          // In this SDK, retrieve() returns Stripe.Response<Subscription>
          const { data: sub } = await stripe.subscriptions.retrieve(subId);
          await prisma.subscription.upsert({
            where: { stripeSubId: sub.id },
            update: {
              status: sub.status.toUpperCase() as any,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              plan: detectPlanFromItems(sub),
            },
            create: {
              userId: user.id,
              stripeSubId: sub.id,
              status: sub.status.toUpperCase() as any,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              plan: detectPlanFromItems(sub),
            },
          });
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Here event carries a plain Subscription already
      const sub = event.data.object as Stripe.Subscription;
      const plan = detectPlanFromItems(sub);
      await prisma.subscription.upsert({
        where: { stripeSubId: sub.id },
        update: {
          status: sub.status.toUpperCase() as any,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          plan,
        },
        create: {
          userId: await findUserIdByCustomer(sub.customer),
          stripeSubId: sub.id,
          status: sub.status.toUpperCase() as any,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          plan,
        },
      });
      break;
    }
  }

  return new Response("ok");
}

// Helpers
function detectPlanFromItems(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id || "";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "MONTHLY";
  if (priceId === process.env.STRIPE_PRICE_QUARTERLY) return "QUARTERLY";
  if (priceId === process.env.STRIPE_PRICE_SEMIANNUAL) return "SEMIANNUAL";
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "ANNUAL";
  return "MONTHLY";
}

async function findUserIdByCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): Promise<string> {
  const customerId = typeof customer === "string" ? customer : (customer as any)?.id;
  if (!customerId) return "";
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  return user?.id || "";
}
