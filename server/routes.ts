/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Express API routes for Mark's Hobby Farm. Defines all /api/* endpoints:
 *          Auth (Google OAuth login/callback/me/logout), Products (list all, get by ID),
 *          Checkout (POST /api/checkout creates Stripe PaymentIntent via server/stripe.ts),
 *          Orders (GET user orders, GET single order), Stripe webhook (POST /api/stripe/webhook),
 *          and health check. Uses isAuthenticated middleware from server/auth.ts for protected routes.
 *          Adapted from ModelCompare modular route pattern -- consolidated into single router.
 *          Depends on server/storage.ts, server/auth.ts, server/stripe.ts.
 * SRP/DRY check: Pass - single route file, no duplication
 */

import { Router } from "express";
import passport from "passport";
import { storage } from "./storage.js";
import { isAuthenticated } from "./auth.js";
import { createCheckoutIntent, handleWebhook } from "./stripe.js";
import type { CartItem } from "../shared/schema.js";

const router = Router();

// ─── Auth routes ─────────────────────────────────────────────

// Initiate Google OAuth login
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
  (_req, res) => {
    // Redirect to home after successful login
    res.redirect("/");
  }
);

// Get current authenticated user
router.get("/auth/me", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({ user: req.user });
  }
  res.json({ user: null });
});

// Logout
router.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true });
  });
});

// ─── Product routes (public) ─────────────────────────────────

// List all active products
router.get("/products", async (_req, res) => {
  try {
    const productList = await storage.getProducts();
    res.json({ products: productList });
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// Get single product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await storage.getProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    console.error("Failed to fetch product:", err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

// ─── Order / Checkout routes (authenticated) ─────────────────

// Create a checkout session (payment intent) for cart items
router.post("/checkout", isAuthenticated, async (req, res) => {
  try {
    const { items } = req.body as { items: CartItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const user = req.user!;
    const result = await createCheckoutIntent(
      user.id,
      items,
      user.email || undefined,
      user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined
    );

    res.json(result);
  } catch (err: any) {
    console.error("Checkout failed:", err);
    res.status(400).json({ error: err.message || "Checkout failed" });
  }
});

// Get current user's order history
router.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const userOrders = await storage.getUserOrders(req.user!.id);
    res.json({ orders: userOrders });
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Get single order by ID (only if it belongs to the user)
router.get("/orders/:id", isAuthenticated, async (req, res) => {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await storage.getOrderById(orderId);
    if (!order || order.userId !== req.user!.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ order });
  } catch (err) {
    console.error("Failed to fetch order:", err);
    res.status(500).json({ error: "Failed to load order" });
  }
});

// ─── Stripe webhook (raw body required) ──────────────────────
// NOTE: This must be registered BEFORE express.json() in index.ts
//       or handled with a raw body parser. We handle it in index.ts.

router.post("/stripe/webhook", async (req: any, res) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

  const result = await handleWebhook(req.rawBody, sig);

  if (result.success) {
    res.json({ received: true });
  } else {
    res.status(400).json({ error: result.message });
  }
});

// ─── Health check ────────────────────────────────────────────

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
