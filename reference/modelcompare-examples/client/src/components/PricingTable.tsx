/**
 * Author: Buffy (Claude 4 Sonnet)
 * Date: 2025-01-15
 * PURPOSE: PricingTable component displays available credit packages for purchase.
 * Integrates with Stripe payment system, shows package options with pricing,
 * handles payment intent creation, and provides clean purchase flow.
 * SRP check: Pass - Single responsibility (credit package display and purchase)
 * shadcn/ui: Pass - Uses Card, Badge, Button, Skeleton, Alert components
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Crown,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Zap,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents
  description: string;
  popular?: boolean;
}

interface PackagesResponse {
  packages: CreditPackage[];
}

interface PaymentIntentResponse {
  clientSecret: string;
  packageInfo: CreditPackage;
}

interface PricingTableProps {
  onPackageSelect?: (packageId: string, clientSecret: string, packageInfo: CreditPackage) => void;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
}

export function PricingTable({ 
  onPackageSelect, 
  onClose,
  className,
  compact = false 
}: PricingTableProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<PackagesResponse>({
    queryKey: ['credit-packages'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/packages', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createPaymentIntent = useMutation<PaymentIntentResponse, Error, string>({
    mutationFn: async (packageId: string) => {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ packageId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }
      
      return response.json();
    },
    onSuccess: (data, packageId) => {
      if (onPackageSelect) {
        onPackageSelect(packageId, data.clientSecret, data.packageInfo);
      }
      // Invalidate credits query to refresh balance after purchase
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
    },
    onError: (error) => {
      console.error('Payment intent creation failed:', error);
    },
  });

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    createPaymentIntent.mutate(packageId);
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const formatCreditsPerDollar = (credits: number, priceInCents: number) => {
    const creditsPerDollar = (credits / (priceInCents / 100)).toFixed(0);
    return `${creditsPerDollar} credits/$`;
  };

  const getBestValueBadge = (pkg: CreditPackage, packages: CreditPackage[]) => {
    if (pkg.popular) {
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground">
          <Star className="w-3 h-3 mr-1" />
          Most Popular
        </Badge>
      );
    }
    
    // Check if it's the best value (most credits per dollar)
    const creditsPerDollar = pkg.credits / (pkg.price / 100);
    const isBestValue = packages.every(p => 
      p.id === pkg.id || creditsPerDollar >= (p.credits / (p.price / 100))
    );
    
    if (isBestValue && !pkg.popular) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Crown className="w-3 h-3 mr-1" />
          Best Value
        </Badge>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className={cn(
          "grid gap-4", 
          compact ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="relative">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Failed to load credit packages. Please try again.
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const packages = data?.packages || [];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Choose Your Credit Package
        </h2>
        <p className="text-muted-foreground">
          Select a package to continue using AI model comparisons
        </p>
      </div>

      {/* Error Display */}
      {createPaymentIntent.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Payment setup failed: {createPaymentIntent.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Package Grid */}
      <div className={cn(
        "grid gap-4", 
        compact ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {packages.map((pkg) => {
          const isProcessing = selectedPackage === pkg.id && createPaymentIntent.isPending;
          const bestValueBadge = getBestValueBadge(pkg, packages);
          
          return (
            <Card 
              key={pkg.id} 
              className={cn(
                "relative transition-all duration-200 hover:shadow-lg",
                pkg.popular && "border-primary shadow-md",
                isProcessing && "opacity-75"
              )}
            >
              {/* Popular Badge */}
              {bestValueBadge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  {bestValueBadge}
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {formatPrice(pkg.price)}
                </div>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                {/* Credits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-1">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xl font-semibold">
                      {pkg.credits.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCreditsPerDollar(pkg.credits, pkg.price)}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {pkg.description}
                </p>

                {/* Usage Calculation */}
                <div className="text-xs text-muted-foreground">
                  ≈ {Math.floor(pkg.credits / 5)} model comparisons
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isProcessing || createPaymentIntent.isPending}
                  className={cn(
                    "w-full",
                    pkg.popular && "bg-primary hover:bg-primary/90"
                  )}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          <Check className="w-3 h-3 inline mr-1" />
          Secure payment processing by Stripe
        </p>
      </div>

      {/* Close Button */}
      {onClose && (
        <div className="text-center">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

export default PricingTable;
