/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Google OAuth authentication using Passport.js.
 *          Handles user login, session management, and auth middleware.
 *          Adapted from ModelCompare auth.ts, simplified for farm website.
 * SRP/DRY check: Pass
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage.js";

// Resolve the OAuth callback URL from environment
function resolveCallbackUrl(): string {
  const explicit = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (explicit) return explicit;

  const domain = process.env.DOMAIN?.trim();
  if (domain) {
    const base = domain.startsWith("http") ? domain : `https://${domain}`;
    return `${base.replace(/\/+$/, "")}/api/auth/google/callback`;
  }

  return "http://localhost:3000/api/auth/google/callback";
}

/**
 * Configure Passport with Google OAuth strategy.
 * Serializes only the user ID into the session for efficiency.
 */
export function configurePassport() {
  // Store user ID in session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Fetch full user from DB on each request
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(new Error("User not found"), null);
      done(null, user as Express.User);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: resolveCallbackUrl(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Upsert user from Google profile data
          const user = await storage.upsertUser({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
          });
          return done(null, user as Express.User);
        } catch (err) {
          console.error("Google OAuth error:", err);
          return done(err as Error, undefined);
        }
      }
    )
  );
}

/**
 * Configure Express session middleware.
 * Uses in-memory store for simplicity; swap to connect-pg-simple for production.
 */
export function configureSession(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "farm-dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
}

/**
 * Middleware: require authentication for protected routes.
 * Returns 401 for API requests, redirects others to Google login.
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) return next();

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  res.redirect("/api/auth/google");
}

// Extend Express User type for TypeScript
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      googleId: string | null;
      stripeCustomerId: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}
