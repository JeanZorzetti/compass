import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe-webhook] verify failed:", msg);
    return NextResponse.json({ error: `verify failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const userId = cs.metadata?.userId;
        const plan = cs.metadata?.plan;
        if (!userId) break;

        if (plan === "lifetime") {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "lifetime",
              trialEndsAt: null,
              stripeSubscriptionId: null,
            },
          });
        } else if (plan === "pro_monthly" && cs.subscription) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "pro",
              trialEndsAt: null,
              stripeSubscriptionId: String(cs.subscription),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer);
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, plan: true },
        });
        if (!user) break;

        // Se cancelado ou unpaid, volta pro trial (ou expirado)
        if (sub.status === "canceled" || sub.status === "unpaid") {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: "trial_expired",
              stripeSubscriptionId: null,
            },
          });
        } else if (sub.status === "active" && user.plan !== "lifetime") {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: "pro",
              stripeSubscriptionId: sub.id,
            },
          });
        }
        break;
      }

      default:
        // Ignora eventos não relevantes
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler failed:", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
