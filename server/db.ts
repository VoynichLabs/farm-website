/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Database connection for Mark's Hobby Farm. Uses Neon serverless PostgreSQL
 *          with Drizzle ORM to provide a single shared db instance. Imports full schema
 *          from shared/schema.ts for type-safe queries. Required env var: DATABASE_URL.
 *          Consumed by server/storage.ts and server/stripe.ts (updateOrderStripeIntent).
 * SRP/DRY check: Pass - single DB connection module, no duplication
 */

import "dotenv/config"; // Ensure env vars (e.g., DATABASE_URL) are loaded before validation
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create Neon SQL connection
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });
