/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Seed script to populate the products table with real egg products
 *          from Mark's Hobby Farm (653 Pudding Hill Road, Hampton, CT).
 *          Products reflect actual flock: Easter Eggers (blue eggs), Speckled Sussex,
 *          Barred Rock, and fertilized hatching eggs from Lil Big Red Jr. and Whitey Redlegs.
 *          Run with: npm run seed
 * SRP/DRY check: Pass - verified no existing seed utilities
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

  // Real products based on the actual flock at 653 Pudding Hill Road, Hampton, CT.
  // Breeds: Easter Eggers, Speckled Sussex, Barred Rock.
  // Roosters: Lil Big Red Jr. and Whitey Redlegs ensure all eggs are fertilized.
  const eggProducts = [
    {
      name: "Blue Eggs -- Dozen",
      description:
        "A dozen blue eggs from our Easter Egger hens. All eggs are fertilized by our roosters " +
        "Lil Big Red Jr. and Whitey Redlegs, giving them a superior nutritional profile " +
        "compared to commercial grocery store eggs. Eat them or hatch them.",
      price: 899, // $8.99
      inventory: 30,
      active: true,
    },
    {
      name: "Heritage Mix -- Dozen",
      description:
        "A mixed dozen from our Speckled Sussex, Barred Rock, and Easter Egger hens. " +
        "Every carton is different -- brown, blue, and speckled shells. " +
        "All fertilized, all free-range on Pudding Hill Road.",
      price: 799, // $7.99
      inventory: 40,
      active: true,
    },
    {
      name: "Hatching Eggs -- Half Dozen",
      description:
        "Six fertilized hatching eggs selected for hatchability. " +
        "Rooster genetics from Lil Big Red Jr. (farm-hatched) and Whitey Redlegs " +
        "(hatched from a blue egg right on Mark's desk). " +
        "Incubate these to raise your own hybrid flock.",
      price: 1499, // $14.99
      inventory: 20,
      active: true,
    },
  ];

  for (const product of eggProducts) {
    await db.insert(products).values(product);
    console.log(`  [seeded] ${product.name} -- $${(product.price / 100).toFixed(2)}`);
  }

  console.log("\nDone! Products seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
