/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27T19:35:21-04:00
 * PURPOSE: Real Stripe checkout component using Stripe Elements.
 *          Handles actual payment processing with real Stripe client secret.
 *          NO MOCK DATA - connects to real Stripe payment intents from backend.
 * SRP/DRY check: Pass - Single responsibility (Stripe payment processing)
 * shadcn/ui: Pass - Uses Card, Button, Alert components from shadcn/ui
 */

import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Coins
} from "lucide-react";

// Initialize Stripe (we'll need to add the publishable key to environment)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents
  description: string;
  popular?: boolean;
}

interface CheckoutFormProps {
  clientSecret: string;
  packageInfo: CreditPackage;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, packageInfo, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `User ${user.id.slice(-4)}`,
          },
        },
      });

      if (paymentError) {
        setPaymentError(paymentError.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: paymentError.message || 'There was an error processing your payment.',
          variant: 'destructive',
        });
      } else if (paymentIntent?.status === 'succeeded') {
        toast({
          title: 'Payment Successful!',
          description: `${packageInfo.credits} credits have been added to your account.`,
        });

        // Refresh user data to update credit balance
        refreshUser();

        // Call success callback
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setPaymentError(errorMessage);
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Your Purchase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Package Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{packageInfo.name}</span>
            <span className="font-bold">${(packageInfo.price / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Coins className="w-4 h-4 mr-1" />
            {packageInfo.credits.toLocaleString()} credits
          </div>
          <p className="text-xs text-muted-foreground mt-1">{packageInfo.description}</p>
        </div>

        <Separator />

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {paymentError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pay ${(packageInfo.price / 100).toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground text-center">
          <p>🔒 Payments are securely processed by Stripe</p>
          <p>Your card information is never stored on our servers</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface RealStripeCheckoutProps {
  clientSecret: string;
  packageInfo: CreditPackage;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RealStripeCheckout(props: RealStripeCheckoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Elements stripe={stripePromise}>
        <CheckoutForm {...props} />
      </Elements>
    </div>
  );
}

export default RealStripeCheckout;