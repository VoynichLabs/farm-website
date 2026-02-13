/**
 * Stripe Payment Processing Service
 * 
 * This module handles all Stripe-related operations for credit purchases in the
 * AI Model Comparison application. It provides:
 * 
 * - Payment intent creation for credit packages
 * - Webhook event processing for payment confirmations
 * - Credit package definitions and pricing
 * - Automatic credit addition after successful payments
 * - Secure webhook signature verification
 * 
 * The service integrates with the storage layer to update user credits
 * automatically upon successful payments, ensuring atomic credit operations.
 * 
 * Author: Cascade (Claude 4 Sonnet)
 * Date: September 27, 2025
 * PURPOSE: Secure payment processing with automatic credit fulfillment
 * SRP and DRY check: Pass - Single responsibility for payment processing, 
 * no duplication of Stripe logic elsewhere in the codebase.
 */

import Stripe from 'stripe';
import { getStorage } from './storage.js';
import { contextLog, contextError } from './request-context.js';

let stripeClient: Stripe | null = null;

function getStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return secret;
}

function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecret(), {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
}

export function __resetStripeClientForTests() {
  stripeClient = null;
}

// Credit package definitions - these define what users can purchase
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents (USD)
  description: string;
  popular?: boolean; // Flag for highlighting popular packages
}

// Available credit packages for purchase
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credits_100',
    name: 'Starter Pack',
    credits: 100,
    price: 499, // $4.99
    description: '100 credits - Perfect for trying out different models',
  },
  {
    id: 'credits_500',
    name: 'Popular Pack',
    credits: 500,
    price: 1999, // $19.99
    description: '500 credits - Best value for regular users',
    popular: true,
  },
  {
    id: 'credits_1000',
    name: 'Power Pack',
    credits: 1000,
    price: 3499, // $34.99
    description: '1000 credits - For heavy users and teams',
  },
  {
    id: 'credits_2500',
    name: 'Enterprise Pack',
    credits: 2500,
    price: 7999, // $79.99
    description: '2500 credits - Maximum value for enterprises',
  },
];

/**
 * Create a Stripe payment intent for purchasing credits
 * This generates a client secret that the frontend can use to complete payment
 */
export async function createPaymentIntent(
  userId: string,
  packageId: string
): Promise<{ clientSecret: string; packageInfo: CreditPackage }> {
  try {
    const stripe = getStripeClient();
    const storage = await getStorage();

    // Find the requested credit package
    const packageInfo = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!packageInfo) {
      throw new Error(`Invalid credit package ID: ${packageId}`);
    }

    // Get user to access email for Stripe customer
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer with user's email
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;
      await storage.updateStripeCustomerId(userId, customerId);
      contextLog(`Created Stripe customer ${customerId} for user ${userId}`);
    }

    // Create the payment intent with Stripe customer attached
    const paymentIntent = await stripe.paymentIntents.create({
      amount: packageInfo.price,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        packageId,
        credits: packageInfo.credits.toString(),
      },
      description: `${packageInfo.name} - ${packageInfo.credits} credits`,
      receipt_email: user.email || undefined,
    });

    contextLog(`Created payment intent for user ${userId}: ${packageInfo.name} (${packageInfo.credits} credits)`);

    return {
      clientSecret: paymentIntent.client_secret!,
      packageInfo,
    };
  } catch (error) {
    contextError('Failed to create payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Handle Stripe webhook events
 * This processes payment confirmations and automatically adds credits to user accounts
 */
export async function handleStripeWebhook(
  body: Buffer,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    const stripe = getStripeClient();
    // Verify webhook signature for security
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    contextLog(`Received Stripe webhook: ${event.type}`);

    // Handle successful payment confirmation
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const { userId, credits, packageId } = paymentIntent.metadata;
      const creditsToAdd = parseInt(credits);

      if (!userId || !credits) {
        throw new Error('Missing required metadata in payment intent');
      }

      // Add credits to user account
      const storage = await getStorage();
      const updatedUser = await storage.addCredits(userId, creditsToAdd);
      
      // Record the transaction in payment history
      const packageInfo = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
      await storage.createPaymentTransaction({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        invoiceNumber: `INV-${Date.now()}-${paymentIntent.id.slice(-6).toUpperCase()}`,
        description: packageInfo ? `${packageInfo.name} - ${packageInfo.credits} credits` : `Credit purchase - ${creditsToAdd} credits`,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        credits: creditsToAdd,
        status: 'completed',
        type: 'credit_purchase',
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        cardLast4: (paymentIntent.payment_method as any)?.card?.last4 || null,
        receiptUrl: paymentIntent.receipt_email ? `https://dashboard.stripe.com/payments/${paymentIntent.id}` : null,
        metadata: { packageId, stripeCustomerId: paymentIntent.customer },
      });
      
      contextLog(`Successfully added ${creditsToAdd} credits to user ${userId}. New balance: ${updatedUser.credits}`);

      return {
        success: true,
        message: `Added ${creditsToAdd} credits to user account`,
      };
    }

    // Handle payment failures
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userId, credits, packageId } = paymentIntent.metadata;
      
      if (userId) {
        // Record the failed transaction in payment history
        const storage = await getStorage();
        const packageInfo = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
        await storage.createPaymentTransaction({
          userId,
          stripePaymentIntentId: paymentIntent.id,
          invoiceNumber: `INV-${Date.now()}-${paymentIntent.id.slice(-6).toUpperCase()}`,
          description: packageInfo ? `${packageInfo.name} - Payment Failed` : 'Credit purchase - Payment Failed',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          credits: credits ? parseInt(credits) : null,
          status: 'failed',
          type: 'credit_purchase',
          paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
          metadata: { 
            packageId, 
            failureMessage: paymentIntent.last_payment_error?.message,
            failureCode: paymentIntent.last_payment_error?.code,
          },
        });
      }
      
      contextError(`Payment failed for user ${userId}`);
      
      return {
        success: true,
        message: 'Payment failure logged',
      };
    }

    // For other event types, just acknowledge receipt
    return {
      success: true,
      message: `Webhook processed: ${event.type}`,
    };

  } catch (error) {
    contextError('Webhook processing failed:', error);
    return {
      success: false,
      message: 'Webhook processing failed',
    };
  }
}

/**
 * Get available credit packages for frontend display
 */
export function getCreditPackages(): CreditPackage[] {
  return CREDIT_PACKAGES;
}

/**
 * Validate that Stripe is properly configured
 */
export function validateStripeConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  // Validate secret key format
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY does not appear to be a valid Stripe secret key');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
