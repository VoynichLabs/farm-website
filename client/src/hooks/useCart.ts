/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Shopping cart hook for Mark's Hobby Farm. Persists cart items to
 *          localStorage so cart survives page refreshes. Provides addItem, removeItem,
 *          updateQuantity, clearCart operations plus totalPrice and itemCount derived state.
 *          Cart is client-side only; items are sent to /api/checkout at payment time.
 *          Depends on React useState, useEffect, useCallback.
 * SRP/DRY check: Pass - single cart hook used by App, Cart page, Products page
 */

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // in cents
}

const CART_KEY = "farm-cart";

// Load cart from localStorage
function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save cart to localStorage
function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  // Persist to localStorage on every change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  // Add a product (or increment if already in cart)
  const addItem = useCallback((product: { id: string; name: string; price: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.price }];
    });
  }, []);

  // Remove an item entirely
  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  // Set exact quantity for an item
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  // Empty the cart (e.g. after successful checkout)
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Total price in cents
  const totalPrice = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalPrice,
    itemCount,
  };
}
