/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Stripe Elements checkout component for completing egg purchases.
 *          Wraps Stripe CardElement in a clean payment form.
 *          Adapted from ModelCompare RealStripeCheckout.tsx.
 * SRP/DRY check: Pass
 */

import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

// Initialize Stripe with the publishable key from Vite env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

interface CheckoutFormProps {
  clientSecret: string;
  totalCents: number;
  itemSummary: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Inner form component that uses Stripe hooks
function CheckoutForm({ clientSecret, totalCents, itemSummary, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      setIsProcessing(false);
      return;
    }

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (paymentError) {
        setError(paymentError.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": { color: "#aab7c4" },
      },
      invalid: { color: "#c44536" },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Your Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Order summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">Order Total</span>
            <span className="font-bold text-lg">${(totalCents / 100).toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500">{itemSummary}</p>
        </div>

        <Separator />

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pay ${(totalCents / 100).toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Security note */}
        <p className="text-xs text-gray-400 text-center">
          Payments securely processed by Stripe. Your card info is never stored on our servers.
        </p>
      </CardContent>
    </Card>
  );
}

// Outer wrapper that provides Stripe context
interface StripeCheckoutProps {
  clientSecret: string;
  totalCents: number;
  itemSummary: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripeCheckout(props: StripeCheckoutProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
