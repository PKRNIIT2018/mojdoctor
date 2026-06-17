import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe: any = key ? new Stripe(key, {} as any) : null;

export function getStripe(): any {
  if (!stripe) throw new Error("STRIPE_SECRET_KEY not configured");
  return stripe;
}

export const STRIPE_CONSULT_AMOUNT = 5000;
export const STRIPE_CURRENCY = "eur";
