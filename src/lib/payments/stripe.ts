import Stripe from "stripe";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

/** Returns a configured Stripe client, or null if STRIPE_SECRET_KEY isn't set. */
export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return client;
}
