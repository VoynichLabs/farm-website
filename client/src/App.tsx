/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Main App component with client-side routing (wouter).
 *          Wires up Navbar, cart state, and page routes.
 * SRP/DRY check: Pass
 */

import { Route, Switch } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Home } from "@/pages/Home";
import { Products } from "@/pages/Products";
import { CartPage } from "@/pages/Cart";
import { Orders } from "@/pages/Orders";
import { useCart } from "@/hooks/useCart";

export default function App() {
  const { items, addItem, removeItem, updateQuantity, clearCart, totalPrice, itemCount } = useCart();

  return (
    <div className="min-h-screen bg-farm-cream">
      <Navbar cartItemCount={itemCount} />

      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/products">
            <Products onAddToCart={addItem} />
          </Route>
          <Route path="/cart">
            <CartPage
              items={items}
              totalPrice={totalPrice}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
              clearCart={clearCart}
            />
          </Route>
          <Route path="/orders" component={Orders} />
          {/* 404 fallback */}
          <Route>
            <div className="max-w-md mx-auto px-4 py-20 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
              <p className="text-gray-500">The page you're looking for doesn't exist.</p>
            </div>
          </Route>
        </Switch>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center text-sm text-gray-500">
        <p>Mark's Hobby Farm &middot; 653 Pudding Hill Road, Hampton, CT</p>
        <p className="mt-1">A portfolio demonstration by Mark Barney</p>
      </footer>
    </div>
  );
}
