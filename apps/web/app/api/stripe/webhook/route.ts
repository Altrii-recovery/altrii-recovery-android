import Stripe from "stripe";
import { prisma } from "@/lib/db";

// Ensure Node runtime so we can read raw body
export const runtime = "nodejs";

function asSubscription(x: any): Stripe.Subscription {
  // Handle both Response<Subscription> and Subscription
  return (x && x.data && x.data.object === "subscription") ? x.data as Stripe.Subscription : x as Stripe.Subscription;
}

// TS-safe getter for current period end (Stripe types vary by SDK/API version)
function getCurrentPeriodEnd(sub: any): Date {
  const t =
    sub?.current_period_end ??
    sub?.current_period_end_at ??  // some SDKs
    sub?.currentPeriodEnd ??       // very new camelCase
    0;
  const n = Number(t) || 0;
  // If Stripe returns ms in the future (unlikely here), normalize
  return new Date(n > 1e12 ? n : n * 1000);
}

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
          const subRaw = await stripe.subscriptions.retrieve(subId);
          const sub = asSubscription(subRaw);
          await prisma.subscription.upsert({
            where: { stripeSubId: sub.id },
            update: {
              status: (sub.status as string).toUpperCase() as any,
              currentPeriodEnd: getCurrentPeriodEnd(sub),
              plan: detectPlanFromItems(sub),
            },
            create: {
              userId: user.id,
              stripeSubId: sub.id,
              status: (sub.status as string).toUpperCase() as any,
              currentPeriodEnd: getCurrentPeriodEnd(sub),
              plan: detectPlanFromItems(sub),
            },
          });
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = asSubscription(event.data.object as any);
      const plan = detectPlanFromItems(sub);
      await prisma.subscription.upsert({
        where: { stripeSubId: sub.id },
        update: {
          status: (sub.status as string).toUpperCase() as any,
          currentPeriodEnd: getCurrentPeriodEnd(sub),
          plan,
        },
        create: {
          userId: await findUserIdByCustomer(sub.customer),
          stripeSubId: sub.id,
          status: (sub.status as string).toUpperCase() as any,
          currentPeriodEnd: getCurrentPeriodEnd(sub),
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
  const priceId = sub.items?.data?.[0]?.price?.id || "";
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
