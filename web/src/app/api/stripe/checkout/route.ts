import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICES, isLifetime } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan as "monthly" | "lifetime" | undefined;

  const priceId = plan === "lifetime" ? STRIPE_PRICES.lifetime : STRIPE_PRICES.proMonthly;
  if (!priceId) {
    return NextResponse.json({ error: "price not configured" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!user?.email) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  try {
    const stripe = getStripe();

    // Resolve um customer válido. Um stripeCustomerId salvo pode ser de outro
    // modo (test vs live) ou ter sido deletado — nesse caso recriamos.
    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as { deleted?: boolean }).deleted) customerId = null;
      } catch {
        customerId = null; // não existe neste modo → recria
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3001";
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: isLifetime(priceId) ? "payment" : "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?cancelled=1`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        plan: isLifetime(priceId) ? "lifetime" : "pro_monthly",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout failed";
    console.error("[stripe-checkout] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
