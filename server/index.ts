/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Express server entry point for Mark's Hobby Farm website.
 *          Configures middleware, auth, API routes, and static file serving.
 *          Adapted from ModelCompare server/index.ts, heavily simplified.
 * SRP/DRY check: Pass
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { configurePassport, configureSession } from "./auth.js";
import { validateStripeConfig } from "./stripe.js";
import apiRoutes from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ── Raw body capture for Stripe webhooks (must come before express.json) ──
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// Attach raw body to request for webhook verification
app.use((req: any, _res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    req.rawBody = req.body;
  }
  next();
});

// ── Standard middleware ───────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Auth: sessions + passport ─────────────────────────────────
configurePassport();
configureSession(app);

// ── Validate Stripe config at startup ─────────────────────────
const stripeStatus = validateStripeConfig();
if (!stripeStatus.valid) {
  console.warn("⚠️  Stripe config issues:", stripeStatus.errors.join("; "));
} else {
  console.log("✅ Stripe configuration validated");
}

// ── API routes under /api ─────────────────────────────────────
app.use("/api", apiRoutes);

// ── Serve Vite frontend (production build or dev proxy) ───────
const publicDir = path.resolve(__dirname, "../dist/public");
app.use(express.static(publicDir));

// SPA fallback: serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🐔 Farm website server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});
