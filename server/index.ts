/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Express server entry point for Mark's Hobby Farm website.
 *          Configures raw body capture for Stripe webhooks (must precede express.json),
 *          standard middleware (JSON, URL-encoded), Passport auth + sessions via server/auth.ts,
 *          validates Stripe config at startup, mounts API routes from server/routes.ts under /api,
 *          serves Vite production build from dist/public with SPA fallback.
 *          Adapted from ModelCompare server/index.ts -- heavily simplified.
 *          Env vars: PORT, NODE_ENV, plus all vars required by auth.ts and stripe.ts.
 * SRP/DRY check: Pass - single server entry, no duplication
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
  console.warn("[WARN] Stripe config issues:", stripeStatus.errors.join("; "));
} else {
  console.log("[OK] Stripe configuration validated");
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
  console.log(`[farm-website] Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});
