/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Order history page — shows all past orders for the logged-in user.
 * SRP/DRY check: Pass
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Package, Loader2, AlertTriangle, ShoppingCart } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  items: string; // JSON string of OrderItem[]
  totalPrice: number;
  status: string;
  createdAt: string;
}

export function Orders() {
  const { isAuthenticated, login } = useAuth();

  const { data, isLoading, error } = useQuery<{ orders: Order[] }>({
    queryKey: ["user-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-12 h-12 mx-auto text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900">Sign In to View Orders</h2>
        <p className="text-gray-500">You need to be signed in to see your order history.</p>
        <Button onClick={login}>Sign In with Google</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-farm-green" />
        <span className="ml-3 text-gray-500">Loading orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
        <p className="text-gray-700">Failed to load orders.</p>
      </div>
    );
  }

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 mx-auto text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900">No Orders Yet</h2>
        <p className="text-gray-500">You haven't placed any orders. Browse our eggs!</p>
        <Link href="/products">
          <Button>Shop Eggs</Button>
        </Link>
      </div>
    );
  }

  // Map order status to badge variant
  const statusVariant = (s: string) => {
    if (s === "completed") return "success" as const;
    if (s === "failed") return "destructive" as const;
    return "warning" as const;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          let items: OrderItem[] = [];
          try { items = JSON.parse(order.items); } catch { /* noop */ }

          return (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Order #{order.id.slice(0, 8)}
                  </CardTitle>
                  <Badge variant={statusVariant(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ${((item.unitPrice * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t font-semibold">
                  <span>Total</span>
                  <span>${(order.totalPrice / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
