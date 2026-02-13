/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Database connection using Neon serverless PostgreSQL + Drizzle ORM.
 *          Provides a single shared db instance for all storage operations.
 * SRP/DRY check: Pass
 */

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
