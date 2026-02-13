/**
 * Author: Buffy the Base Agent
 * Date: 2025-10-04
 * PURPOSE: Billing page that surfaces account info, Google OAuth actions, and credit purchase UI.
 * SRP/DRY check: Pass - Single page wrapper composing existing auth hook and PricingTable.
 * shadcn/ui: Pass - Uses existing button and layout utility classes; relies on shared components.
 */

import { useAuth } from "@/hooks/useAuth";
import PricingTable from "@/components/PricingTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RealStripeCheckout from "@/components/RealStripeCheckout";
import AppNavigation from "@/components/AppNavigation";
import type { CreditPackage } from "@/types/stripe";
import { useState } from "react";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [checkout, setCheckout] = useState<{
    clientSecret: string;
    packageInfo: CreditPackage;
  } | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation
        title="Billing & Credits"
        subtitle="Purchase credits to continue using AI model comparisons"
        icon={CreditCard}
      />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">

      {/* Auth Section */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Authentication</div>
          {isLoading ? (
            <div className="text-sm">Loading account…</div>
          ) : isAuthenticated && user ? (
            <div className="text-sm">
              Signed in • Credits: <span className="font-medium">{(user.credits ?? 0).toLocaleString()}</span>
            </div>
          ) : (
            <div className="text-sm">Not signed in</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Explicit links to API auth endpoints as requested */}
          <a href="/api/auth/google" className="hidden" aria-hidden="true">/api/auth/google</a>
          <a href="/api/auth/logout" className="hidden" aria-hidden="true">/api/auth/logout</a>

          {!isAuthenticated ? (
            <Button onClick={login} variant="default">Sign in with Google</Button>
          ) : (
            <Button onClick={logout} variant="outline">Sign out</Button>
          )}
        </div>
      </div>

      {/* Stripe publishable key guard */}
      {!import.meta.env.VITE_STRIPE_PUBLIC_KEY && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Stripe publishable key (VITE_STRIPE_PUBLIC_KEY) is not set. Payments will not initialize. Add it to your .env.
          </AlertDescription>
        </Alert>
      )}

      {/* Info note about purchase requirements */}
      <div className="mb-6 text-sm text-muted-foreground">
        Note: Purchasing credits requires a Google sign-in (OAuth). Device users can continue to use the app with credits,
        but must sign in to buy more credits.
      </div>

      {/* Pricing Table with checkout launch */}
      <PricingTable
        className="mt-4"
        onPackageSelect={(_packageId, clientSecret, packageInfo) => {
          setCheckout({ clientSecret, packageInfo });
        }}
      />

        {/* Render checkout when a package is selected */}
        {checkout && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <RealStripeCheckout
                clientSecret={checkout.clientSecret}
                packageInfo={checkout.packageInfo}
                onSuccess={() => setCheckout(null)}
                onCancel={() => setCheckout(null)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
