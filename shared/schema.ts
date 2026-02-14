/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Database schema for Mark's Hobby Farm e-commerce (653 Pudding Hill Road, Hampton, CT).
 *          Defines users (Google OAuth), products (egg listings), orders (Stripe-linked purchases),
 *          and sessions tables using Drizzle ORM against Neon PostgreSQL.
 *          Adapted from ModelCompare credit system -- credits replaced with one-time egg orders.
 *          Used by server/storage.ts (CRUD), server/stripe.ts (order lifecycle), scripts/seed-products.ts.
 * SRP/DRY check: Pass - single schema file, shared across server and client types
 */

import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Users table — customers who sign in via Google OAuth
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  googleId: text("google_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table — egg products available for purchase
export const products = pgTable("products", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // price in cents (899 = $8.99)
  inventory: integer("inventory").notNull().default(0),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table — tracks each purchase through Stripe
export const orders = pgTable("orders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  // Store items as JSON string: [{productId, name, quantity, unitPrice}]
  items: text("items").notNull(),
  totalPrice: integer("total_price").notNull(), // in cents
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table — for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Type exports derived from Drizzle schema
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Cart item shape (stored in order.items as JSON)
export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // in cents
}
