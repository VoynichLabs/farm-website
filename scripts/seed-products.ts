/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Seed script to populate the products table with initial egg offerings.
 *          Run with: npm run seed
 * SRP/DRY check: Pass
 */

import dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { products } from "../shared/schema.js";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("Seeding products...");

  const eggProducts = [
    {
      name: "Brown Eggs — Dozen",
      description:
        "A dozen farm-fresh brown eggs from our free-range hens. Rich flavor, deep orange yolks.",
      price: 899, // $8.99
      inventory: 50,
      active: true,
    },
    {
      name: "Mixed Heritage — Dozen",
      description:
        "A colorful mix of brown, blue, and green eggs from our heritage breed hens. Every box is unique.",
      price: 1199, // $11.99
      inventory: 30,
      active: true,
    },
    {
      name: "Jumbo Brown Eggs — Half Dozen",
      description:
        "Six extra-large brown eggs. Perfect for baking or a hearty breakfast.",
      price: 599, // $5.99
      inventory: 40,
      active: true,
    },
  ];

  for (const product of eggProducts) {
    await db.insert(products).values(product);
    console.log(`  ✅ ${product.name} — $${(product.price / 100).toFixed(2)}`);
  }

  console.log("\nDone! Products seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
