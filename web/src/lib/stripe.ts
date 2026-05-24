import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Adicione no .env e reinicie o servidor."
    );
  }
  _stripe = new Stripe(key, {
    typescript: true,
    appInfo: {
      name: "Compass",
      url: "https://compass.polarisia.com.br",
    },
  });
  return _stripe;
}

export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  lifetime: process.env.STRIPE_PRICE_LIFETIME ?? "",
};

export function isLifetime(priceId: string): boolean {
  return priceId === STRIPE_PRICES.lifetime;
}
