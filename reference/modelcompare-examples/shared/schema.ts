/**
 * Shared Schema Definitions - Database Models and TypeScript Types
 * 
 * This module defines the central data models and TypeScript types used throughout
 * the application for type safety and consistency. It provides:
 * 
 * - PostgreSQL table schemas using Drizzle ORM
 * - Zod validation schemas for request/response validation
 * - TypeScript type definitions inferred from schemas
 * - Insert and select types for database operations
 * - Shared interfaces between frontend and backend
 * 
 * All data structures flow through this schema definition to ensure type safety
 * across the entire application stack, from database to API to frontend components.
 * Changes here propagate through the entire codebase automatically via TypeScript.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const comparisons = pgTable("comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  selectedModels: jsonb("selected_models").notNull().$type<string[]>(),
  responses: jsonb("responses").notNull().$type<Record<string, {
    content: string;
    status: 'success' | 'error' | 'loading';
    responseTime: number;
    error?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vixra sessions for persisting satirical paper generation
export const vixraSessions = pgTable("vixra_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variables: jsonb("variables").notNull().$type<Record<string, string>>(),
  template: text("template").notNull(),
  responses: jsonb("responses").notNull().$type<Record<string, {
    content: string;
    reasoning?: string;
    status: 'success' | 'error' | 'loading';
    responseTime: number;
    tokenUsage?: { input: number; output: number; reasoning?: number };
    cost?: { total: number; input: number; output: number; reasoning?: number };
    modelName: string;
    error?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt audit trail for structured template resolution tracking
export const promptAudits = pgTable("prompt_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  variables: jsonb("variables").notNull().$type<Record<string, string>>(),
  resolvedSections: jsonb("resolved_sections").notNull().$type<{
    systemInstructions?: string;
    userContent: string;
    contextContent?: string;
  }>(),
  messageStructure: jsonb("message_structure").notNull().$type<Array<{
    role: 'system' | 'user' | 'assistant' | 'context';
    contentLength: number;
    metadata?: Record<string, any>;
  }>>(),
  modelId: varchar("model_id"),
  responseContent: text("response_content"),
  responseTime: integer("response_time"),
  tokenUsage: jsonb("token_usage").$type<{ input: number; output: number; reasoning?: number }>(),
  cost: jsonb("cost").$type<{ total: number; input: number; output: number; reasoning?: number }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User authentication and billing tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  deviceId: varchar("device_id"), // For anonymous browsing before OAuth
  credits: integer("credits").default(500),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit reservations for atomic credit management
// Prevents race conditions by reserving credits before expensive operations
export const creditReservations = pgTable("credit_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(),
  status: varchar("status").notNull(), // 'pending', 'committed', 'refunded'
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional context (endpoint, modelIds, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 10-minute expiry
});

// Payment transaction history for billing records
// Records every Stripe payment event (success, failure, refund) for user-facing history
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  invoiceNumber: varchar("invoice_number").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // Amount in cents (USD)
  currency: varchar("currency").notNull().default('USD'),
  credits: integer("credits"), // Credits purchased (null for refunds/adjustments)
  status: varchar("status").notNull(), // 'completed', 'pending', 'failed', 'refunded'
  type: varchar("type").notNull(), // 'credit_purchase', 'refund', 'adjustment'
  paymentMethod: varchar("payment_method"), // 'card', 'bank_transfer', etc.
  cardLast4: varchar("card_last4"), // Last 4 digits of card used
  receiptUrl: text("receipt_url"), // Stripe receipt URL
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});
// Luigi pipeline persistence
export const luigiRuns = pgTable("luigi_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  missionName: text("mission_name").notNull(),
  objective: text("objective").notNull(),
  constraints: text("constraints"),
  successCriteria: text("success_criteria"),
  stakeholderNotes: text("stakeholder_notes"),
  userPrompt: text("user_prompt").notNull(),
  status: varchar("status").notNull(),
  currentStageId: varchar("current_stage_id"),
  stages: jsonb("stages").notNull().$type<Record<string, unknown>>(),
  totalCostCents: integer("total_cost_cents"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const luigiMessages = pgTable("luigi_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => luigiRuns.id, { onDelete: 'cascade' }),
  role: varchar("role").notNull(),
  stageId: varchar("stage_id"),
  agentId: varchar("agent_id"),
  toolName: varchar("tool_name"),
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const luigiArtifacts = pgTable("luigi_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => luigiRuns.id, { onDelete: 'cascade' }),
  stageId: varchar("stage_id").notNull(),
  type: varchar("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  storagePath: text("storage_path"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ARC agent workspace persistence
export const arcRuns = pgTable("arc_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  challengeName: text("challenge_name").notNull(),
  puzzleDescription: text("puzzle_description").notNull(),
  puzzlePayload: jsonb("puzzle_payload").notNull().$type<Record<string, unknown>>(),
  targetPatternSummary: text("target_pattern_summary"),
  evaluationFocus: text("evaluation_focus"),
  status: varchar("status").notNull(),
  currentStageId: varchar("current_stage_id"),
  stages: jsonb("stages").notNull().$type<Record<string, unknown>>(),
  totalCostCents: integer("total_cost_cents"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const arcMessages = pgTable("arc_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => arcRuns.id, { onDelete: 'cascade' }),
  role: varchar("role").notNull(),
  stageId: varchar("stage_id"),
  agentId: varchar("agent_id"),
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const arcArtifacts = pgTable("arc_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => arcRuns.id, { onDelete: 'cascade' }),
  stageId: varchar("stage_id").notNull(),
  type: varchar("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Debate sessions for persisting debate state and conversation chaining
export const debateSessions = pgTable('debate_sessions', {
  id: text('id').primaryKey(),
  topicText: text('topic_text').notNull(),
  model1Id: text('model1_id').notNull(),
  model2Id: text('model2_id').notNull(),
  adversarialLevel: integer('adversarial_level').notNull(),
  turnHistory: jsonb('turn_history').notNull(), // Array of turn records
  model1ResponseIds: jsonb('model1_response_ids').notNull(), // Array of response IDs
  model2ResponseIds: jsonb('model2_response_ids').notNull(), // Array of response IDs
  totalCost: numeric('total_cost').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export const insertVixraSessionSchema = createInsertSchema(vixraSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptAuditSchema = createInsertSchema(promptAudits).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions);

export const insertCreditReservationSchema = createInsertSchema(creditReservations).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertLuigiRunSchema = createInsertSchema(luigiRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertLuigiMessageSchema = createInsertSchema(luigiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertLuigiArtifactSchema = createInsertSchema(luigiArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertArcRunSchema = createInsertSchema(arcRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertArcMessageSchema = createInsertSchema(arcMessages).omit({
  id: true,
  createdAt: true,
});

export const insertArcArtifactSchema = createInsertSchema(arcArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertDebateSessionSchema = createInsertSchema(debateSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComparison = z.infer<typeof insertComparisonSchema>;
export type Comparison = typeof comparisons.$inferSelect;
export type InsertVixraSession = z.infer<typeof insertVixraSessionSchema>;
export type VixraSession = typeof vixraSessions.$inferSelect;
export type InsertPromptAudit = z.infer<typeof insertPromptAuditSchema>;
export type PromptAuditRecord = typeof promptAudits.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
// Force TypeScript to regenerate this inferred type
export type User = typeof users.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertCreditReservation = z.infer<typeof insertCreditReservationSchema>;
export type CreditReservation = typeof creditReservations.$inferSelect;

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

export type InsertLuigiRun = z.infer<typeof insertLuigiRunSchema>;
export type LuigiRun = typeof luigiRuns.$inferSelect;
export type InsertLuigiMessage = z.infer<typeof insertLuigiMessageSchema>;
export type LuigiMessage = typeof luigiMessages.$inferSelect;
export type InsertLuigiArtifact = z.infer<typeof insertLuigiArtifactSchema>;
export type LuigiArtifact = typeof luigiArtifacts.$inferSelect;

export type InsertArcRun = z.infer<typeof insertArcRunSchema>;
export type ArcRun = typeof arcRuns.$inferSelect;
export type InsertArcMessage = z.infer<typeof insertArcMessageSchema>;
export type ArcMessage = typeof arcMessages.$inferSelect;
export type InsertArcArtifact = z.infer<typeof insertArcArtifactSchema>;
export type ArcArtifact = typeof arcArtifacts.$inferSelect;

export type InsertDebateSession = z.infer<typeof insertDebateSessionSchema>;
export type DebateSession = typeof debateSessions.$inferSelect;

// Additional types for authentication and billing
export type UpsertUser = Omit<InsertUser, 'id'> & { id?: string };
export type StripeInfo = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

// AI Model types
export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'grok']),
  enabled: z.boolean().default(true),
});

export type AIModel = z.infer<typeof aiModelSchema>;





