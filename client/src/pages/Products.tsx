/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Product listing page — shows all available egg products.
 *          Customers can add items to their cart from here.
 *          Adapted from ModelCompare PricingTable pattern.
 * SRP/DRY check: Pass
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Egg, ShoppingCart, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  inventory: number;
  imageUrl: string | null;
  active: boolean;
}

interface ProductsProps {
  onAddToCart: (product: { id: string; name: string; price: number }) => void;
}

export function Products({ onAddToCart }: ProductsProps) {
  const { data, isLoading, error, refetch } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-farm-green" />
        <span className="ml-3 text-gray-500">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
        <p className="text-gray-700">Failed to load products. Please try again.</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const products = data?.products ?? [];

  if (products.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <Egg className="w-12 h-12 mx-auto text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900">No Products Available</h2>
        <p className="text-gray-500">
          Check back soon — we're restocking our eggs!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Farm Fresh Eggs</h1>
        <p className="text-gray-600">Straight from our hens in Hampton, Connecticut</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const inStock = product.inventory > 0;
          return (
            <Card key={product.id} className="flex flex-col transition hover:shadow-lg">
              {/* Product image placeholder */}
              <div className="h-40 bg-gradient-to-br from-farm-cream to-amber-100 rounded-t-xl flex items-center justify-center">
                <Egg className="w-16 h-16 text-farm-brown opacity-60" />
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {inStock ? (
                    <Badge variant="success" className="text-xs shrink-0">In Stock</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs shrink-0">Sold Out</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2">
                {product.description && (
                  <p className="text-sm text-gray-600">{product.description}</p>
                )}
                <p className="text-2xl font-bold text-farm-green">
                  ${(product.price / 100).toFixed(2)}
                </p>
                {inStock && (
                  <p className="text-xs text-gray-400">{product.inventory} available</p>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  disabled={!inStock}
                  onClick={() => onAddToCart({ id: product.id, name: product.name, price: product.price })}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
