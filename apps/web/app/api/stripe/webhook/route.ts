import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("WEBHOOK_VERIFY_ERROR", err?.message || err);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // attach customer to our user if we set client_reference_id=userId in checkout
        const userId = (s.client_reference_id as string) || null;
        const customerId = (s.customer as string) || null;
        if (userId && customerId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        // find user by customerId
        const customerId = (sub.customer as string) || null;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (user) {
          await prisma.subscription.upsert({
            where: { stripeSubId: sub.id },
            update: {
              userId: user.id,
              status: (sub.status || "incomplete").toUpperCase() as any,
              currentPeriodEnd: new Date((sub.current_period_end || 0) * 1000),
              plan: detectPlan(sub),
            },
            create: {
              stripeSubId: sub.id,
              userId: user.id,
              status: (sub.status || "incomplete").toUpperCase() as any,
              currentPeriodEnd: new Date((sub.current_period_end || 0) * 1000),
              plan: detectPlan(sub),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: "CANCELED" as any },
        });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: String(inv.subscription) },
            data: { status: "PAST_DUE" as any },
          });
        }
        break;
      }
      default:
        // ignore other events
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("WEBHOOK_HANDLER_ERROR", event.type, err?.message || err);
    return new Response("hook error", { status: 500 });
  }
}

// Map Stripe items -> our Plan enum
function detectPlan(sub: Stripe.Subscription) {
  const priceId =
    sub.items?.data?.[0]?.price?.id ||
    sub.items?.data?.[0]?.plan?.id || // legacy
    "";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "MONTHLY";
  if (priceId === process.env.STRIPE_PRICE_QUARTERLY) return "QUARTERLY";
  if (priceId === process.env.STRIPE_PRICE_SEMIANNUAL) return "SEMIANNUAL";
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "ANNUAL";
  return "MONTHLY";
}
