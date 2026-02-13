/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Stripe payment processing for egg orders.
 *          Creates payment intents, handles webhooks, manages order lifecycle.
 *          Adapted from ModelCompare credit-purchase flow → one-time egg purchases.
 * SRP/DRY check: Pass
 */

import Stripe from "stripe";
import { storage } from "./storage.js";
import type { CartItem } from "../shared/schema.js";

let stripeClient: Stripe | null = null;

// Lazy-init Stripe client
function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeClient;
}

/**
 * Create a Stripe PaymentIntent for a cart checkout.
 * Stores order in DB with "pending" status, returns client secret for frontend.
 */
export async function createCheckoutIntent(
  userId: string,
  items: CartItem[],
  customerEmail?: string,
  customerName?: string
): Promise<{ clientSecret: string; orderId: string }> {
  const stripe = getStripe();

  // Calculate total from cart items
  const totalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (totalPrice <= 0) {
    throw new Error("Cart total must be greater than zero");
  }

  // Verify inventory for each item
  for (const item of items) {
    const product = await storage.getProductById(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.inventory < item.quantity) {
      throw new Error(`Insufficient inventory for ${product.name}. Available: ${product.inventory}`);
    }
  }

  // Get or create Stripe customer
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || customerEmail || undefined,
      name:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : customerName || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await storage.updateStripeCustomerId(userId, customerId);
  }

  // Create the order record in DB (pending until webhook confirms payment)
  const order = await storage.createOrder({
    userId,
    items: JSON.stringify(items),
    totalPrice,
    status: "pending",
    customerEmail: user.email || customerEmail || null,
    customerName:
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : customerName || null,
  });

  // Build a human-readable description for the Stripe receipt
  const description = items
    .map((i) => `${i.name} x${i.quantity}`)
    .join(", ");

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalPrice,
    currency: "usd",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order.id,
      userId,
    },
    description: `Farm order: ${description}`,
    receipt_email: user.email || customerEmail || undefined,
  });

  // Link the PaymentIntent to our order
  await storage.updateOrderStatus(order.id, "pending");
  // Store the stripe payment intent ID on the order
  await updateOrderStripeIntent(order.id, paymentIntent.id);

  return {
    clientSecret: paymentIntent.client_secret!,
    orderId: order.id,
  };
}

// Helper to set the stripe intent ID on an order (raw update)
async function updateOrderStripeIntent(orderId: string, intentId: string) {
  // Using storage's db directly for this one-off update
  const { db } = await import("./db.js");
  const { orders } = await import("../shared/schema.js");
  const { eq } = await import("drizzle-orm");
  await db
    .update(orders)
    .set({ stripePaymentIntentId: intentId, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

/**
 * Handle incoming Stripe webhook events.
 * On payment_intent.succeeded → mark order completed, reduce inventory.
 * On payment_intent.payment_failed → mark order failed.
 */
export async function handleWebhook(
  body: Buffer,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    console.log(`[stripe] Webhook received: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = intent.metadata;

      if (!orderId) {
        console.warn("[stripe] No orderId in payment metadata");
        return { success: true, message: "No orderId in metadata, skipping" };
      }

      // Mark order completed
      await storage.updateOrderStatus(orderId, "completed");

      // Decrease inventory for each item
      const order = await storage.getOrderById(orderId);
      if (order) {
        const items: CartItem[] = JSON.parse(order.items);
        for (const item of items) {
          await storage.decrementInventory(item.productId, item.quantity);
        }
      }

      console.log(`[stripe] Order ${orderId} completed`);
      return { success: true, message: `Order ${orderId} completed` };
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = intent.metadata;
      if (orderId) {
        await storage.updateOrderStatus(orderId, "failed");
        console.error(`[stripe] Order ${orderId} payment failed`);
      }
      return { success: true, message: "Payment failure recorded" };
    }

    // Acknowledge other event types
    return { success: true, message: `Processed: ${event.type}` };
  } catch (err) {
    console.error("[stripe] Webhook error:", err);
    return { success: false, message: "Webhook processing failed" };
  }
}

/**
 * Validate that Stripe env vars are configured.
 */
export function validateStripeConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) errors.push("STRIPE_SECRET_KEY not set");
  if (!process.env.STRIPE_WEBHOOK_SECRET) errors.push("STRIPE_WEBHOOK_SECRET not set");
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    errors.push("STRIPE_SECRET_KEY does not look like a valid Stripe secret key");
  }
  return { valid: errors.length === 0, errors };
}
