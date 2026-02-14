/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Shopping cart and checkout page for Mark's Hobby Farm.
 *          Shows cart items with quantity controls, order summary with totals,
 *          and integrates Stripe Elements via StripeCheckout component for payment.
 *          Depends on useAuth hook, useCart hook types, wouter, StripeCheckout component.
 * SRP/DRY check: Pass - single cart/checkout page, no duplication
 */

import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StripeCheckout } from "@/components/StripeCheckout";
import { useAuth } from "@/hooks/useAuth";
import type { CartItem } from "@/hooks/useCart";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  CheckCircle,
  Loader2,
  LogIn,
} from "lucide-react";

interface CartPageProps {
  items: CartItem[];
  totalPrice: number;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

export function CartPage({ items, totalPrice, updateQuantity, removeItem, clearCart }: CartPageProps) {
  const { isAuthenticated, login } = useAuth();
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "paying" | "success">("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request a PaymentIntent from the backend
  const handleCheckout = async () => {
    setCheckoutState("loading");
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setCheckoutState("paying");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setCheckoutState("idle");
    }
  };

  // After successful Stripe payment
  const handlePaymentSuccess = () => {
    setCheckoutState("success");
    clearCart();
  };

  // Order success screen
  if (checkoutState === "success") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <CheckCircle className="w-16 h-16 mx-auto text-farm-green" />
        <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
        <p className="text-gray-600">
          Thank you for your order. You'll receive a confirmation email shortly.
          We'll have your eggs ready for pickup!
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/orders">
            <Button variant="outline">View Orders</Button>
          </Link>
          <Link href="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Stripe checkout form (after PaymentIntent created)
  if (checkoutState === "paying" && clientSecret) {
    const summary = items.map((i) => `${i.name} x${i.quantity}`).join(", ");
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <StripeCheckout
          clientSecret={clientSecret}
          totalCents={totalPrice}
          itemSummary={summary}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setCheckoutState("idle")}
        />
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 mx-auto text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900">Your Cart is Empty</h2>
        <p className="text-gray-500">Browse our farm-fresh eggs and add some to your cart.</p>
        <Link href="/products">
          <Button>Shop Eggs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

      <Card>
        <CardContent className="divide-y pt-6">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  ${(item.unitPrice / 100).toFixed(2)} each
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* Line total + remove */}
              <div className="flex items-center gap-3 ml-4">
                <span className="font-semibold w-16 text-right">
                  ${((item.unitPrice * item.quantity) / 100).toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>${(totalPrice / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pickup</span>
            <span className="text-farm-green font-medium">Free</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${(totalPrice / 100).toFixed(2)}</span>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}

          {isAuthenticated ? (
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={checkoutState === "loading"}
            >
              {checkoutState === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing checkout...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Checkout
                </>
              )}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={login}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign in to Checkout
            </Button>
          )}

          <p className="text-xs text-gray-400 text-center">
            Local pickup at 653 Pudding Hill Road, Hampton, CT (Windham County)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
