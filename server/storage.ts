/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Storage layer (data access) for Mark's Hobby Farm. Provides CRUD operations
 *          for users (upsert from Google OAuth), products (list active, get by ID, decrement
 *          inventory), and orders (create, get by ID/user/Stripe intent, update status).
 *          Uses Drizzle ORM against Neon PostgreSQL via server/db.ts.
 *          Adapted from ModelCompare DbStorage pattern -- credits/reservations removed.
 *          Consumed by server/routes.ts, server/stripe.ts, server/auth.ts.
 * SRP/DRY check: Pass - single storage class, singleton export, no raw SQL elsewhere
 */

import { db } from "./db.js";
import { users, products, orders } from "../shared/schema.js";
import type { User, InsertUser, Product, InsertProduct, Order, InsertOrder } from "../shared/schema.js";
import { eq, desc, sql } from "drizzle-orm";

export class Storage {
  // ─── User operations ───────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.googleId, googleId));
    return result;
  }

  // Create or update user from Google OAuth profile
  async upsertUser(userData: Partial<InsertUser> & { googleId: string }): Promise<User> {
    const existing = await this.getUserByGoogleId(userData.googleId);

    if (existing) {
      // Update profile fields on each login
      const [result] = await db
        .update(users)
        .set({
          email: userData.email ?? existing.email,
          firstName: userData.firstName ?? existing.firstName,
          lastName: userData.lastName ?? existing.lastName,
          profileImageUrl: userData.profileImageUrl ?? existing.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return result;
    }

    // Create new user
    const [result] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        googleId: userData.googleId,
      })
      .returning();
    return result;
  }

  // Save Stripe customer ID on the user record
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [result] = await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  // ─── Product operations ────────────────────────────────────

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.active, true));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [result] = await db.select().from(products).where(eq(products.id, id));
    return result;
  }

  // Atomically decrease inventory (used after successful payment)
  async decrementInventory(productId: string, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({
        inventory: sql`${products.inventory} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  // ─── Order operations ──────────────────────────────────────

  async createOrder(order: InsertOrder): Promise<Order> {
    const [result] = await db.insert(orders).values(order).returning();
    return result;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [result] = await db.select().from(orders).where(eq(orders.id, id));
    return result;
  }

  async getOrderByStripeIntentId(intentId: string): Promise<Order | undefined> {
    const [result] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, intentId));
    return result;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [result] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result;
  }
}

// Singleton instance
export const storage = new Storage();
