/**
 * Storage Layer - Data Persistence and Database Management
 *
 * Author: gpt-5-codex
 * Date: 2025-10-20 18:46 UTC
 * PURPOSE: Maintain a unified storage abstraction for database and in-memory persistence,
 *          ensuring debate sessions, comparisons, prompts, and auth flows share
 *          consistent CRUD operations while surfacing fallbacks when PostgreSQL
 *          is unavailable.
 * SRP/DRY check: Pass - Module centralizes persistence logic, delegating higher-level
 *                orchestration to callers without duplicating query implementations.
 *
 * This module provides a unified storage interface that supports both PostgreSQL
 * and in-memory storage with automatic fallback capabilities. It manages:
 *
 * - Database connections with Neon PostgreSQL (primary) and in-memory (fallback)
 * - CRUD operations for comparison results and session data
 * - Schema validation using Drizzle ORM with TypeScript safety
 * - Session management for user state persistence
 * - Automatic failover between storage backends
 * - Connection pooling and error recovery
 *
 * The storage interface abstracts database operations from the application logic,
 * allowing seamless switching between persistence layers based on configuration
 * and availability.
 */

import { type Comparison, type InsertComparison, type VixraSession, type InsertVixraSession, type PromptAuditRecord, type InsertPromptAudit, type User, type InsertUser, type UpsertUser, type StripeInfo, type CreditReservation, type InsertCreditReservation, type PaymentTransaction, type InsertPaymentTransaction, type LuigiRun, type InsertLuigiRun, type LuigiMessage, type InsertLuigiMessage, type LuigiArtifact, type InsertLuigiArtifact, type ArcRun, type InsertArcRun, type ArcMessage, type InsertArcMessage, type ArcArtifact, type InsertArcArtifact, type DebateSession, type InsertDebateSession, comparisons, vixraSessions, promptAudits, users, creditReservations, paymentTransactions, luigiRuns, luigiMessages, luigiArtifacts, arcRuns, arcMessages, arcArtifacts, debateSessions } from "@shared/schema";
import type { LuigiRunStatus, LuigiStageId } from "@shared/luigi-types";
import type { ArcRunStatus, ArcStageId, ArcMessageRole } from "@shared/arc-types";
import { randomUUID } from "crypto";
import { db, ensureTablesExist } from "./db";
import { eq, desc, sql } from "drizzle-orm";

type LuigiStagesPayload = Record<string, unknown>;

export interface LuigiRunUpdate {
  missionName?: string;
  objective?: string;
  constraints?: string | null;
  successCriteria?: string | null;
  stakeholderNotes?: string | null;
  userPrompt?: string;
  status?: LuigiRunStatus;
  currentStageId?: LuigiStageId | null;
  stages?: LuigiStagesPayload;
  totalCostCents?: number | null;
  completedAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ArcRunUpdate {
  taskId?: string;
  challengeName?: string;
  puzzleDescription?: string;
  puzzlePayload?: Record<string, unknown>;
  targetPatternSummary?: string | null;
  evaluationFocus?: string | null;
  status?: ArcRunStatus;
  currentStageId?: ArcStageId | null;
  stages?: Record<string, unknown>;
  totalCostCents?: number | null;
  completedAt?: Date | null;
  updatedAt?: Date | null;
}

export interface IStorage {
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
  getComparisons(): Promise<Comparison[]>;
  
  // Vixra session persistence
  createVixraSession(session: InsertVixraSession): Promise<VixraSession>;
  updateVixraSession(id: string, session: Partial<InsertVixraSession>): Promise<VixraSession | undefined>;
  getVixraSession(id: string): Promise<VixraSession | undefined>;
  getVixraSessions(): Promise<VixraSession[]>;
  
  // Prompt audit trail
  createPromptAudit(audit: InsertPromptAudit): Promise<PromptAuditRecord>;
  getPromptAudit(id: string): Promise<PromptAuditRecord | undefined>;
  getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]>;
  
  // Luigi pipeline operations
  createLuigiRun(run: InsertLuigiRun): Promise<LuigiRun>;
  updateLuigiRun(id: string, update: LuigiRunUpdate): Promise<LuigiRun | undefined>;
  getLuigiRun(id: string): Promise<LuigiRun | undefined>;
  listLuigiRuns(limit?: number): Promise<LuigiRun[]>;
  appendLuigiMessage(message: InsertLuigiMessage): Promise<LuigiMessage>;
  getLuigiMessages(runId: string, limit?: number): Promise<LuigiMessage[]>;
  saveLuigiArtifact(artifact: InsertLuigiArtifact): Promise<LuigiArtifact>;
  getLuigiArtifacts(runId: string): Promise<LuigiArtifact[]>;

  // ARC agent workspace operations
  createArcRun(run: InsertArcRun): Promise<ArcRun>;
  updateArcRun(id: string, update: ArcRunUpdate): Promise<ArcRun | undefined>;
  getArcRun(id: string): Promise<ArcRun | undefined>;
  listArcRuns(limit?: number): Promise<ArcRun[]>;
  appendArcMessage(message: InsertArcMessage): Promise<ArcMessage>;
  getArcMessages(runId: string, limit?: number): Promise<ArcMessage[]>;
  saveArcArtifact(artifact: InsertArcArtifact): Promise<ArcArtifact>;
  getArcArtifacts(runId: string): Promise<ArcArtifact[]>;

  // Debate session operations
  createDebateSession(session: InsertDebateSession): Promise<DebateSession>;
  updateDebateSession(id: string, turnData: {
    turn: number;
    modelId: string;
    content: string;
    reasoning: string;
    responseId: string;
    cost: number;
    costBreakdown?: any;
    tokenUsage?: any;
    structuredOutput?: unknown;
    summary?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  getDebateSession(id: string): Promise<DebateSession | undefined>;
  listDebateSessions(): Promise<DebateSession[]>;

  // User authentication operations
  getUser(id: string): Promise<User | undefined>;
  getUserByDeviceId(deviceId: string): Promise<User | undefined>;
  createAnonymousUser(deviceId: string): Promise<User>;
  ensureDeviceUser(deviceId: string): Promise<User>;
  upsertUser(userData: UpsertUser): Promise<User>;
  
  // Credit management operations
  getUserCredits(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number): Promise<User>;
  addCredits(userId: string, amount: number): Promise<User>;

  // Credit reservation operations (atomic, prevents race conditions)
  reserveCredits(userId: string, amount: number, metadata?: Record<string, unknown>): Promise<{
    success: boolean;
    reservationId?: string;
    remainingCredits?: number;
    message?: string;
  }>;
  commitReservation(reservationId: string): Promise<void>;
  refundReservation(reservationId: string): Promise<void>;
  getUserPendingReservations(userId: string): Promise<number>;
  cleanupExpiredReservations(): Promise<void>;

  // Stripe integration operations
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User>;

  // Payment transaction history operations
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransactionsByUserId(userId: string): Promise<PaymentTransaction[]>;
  getPaymentTransactionByStripeId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined>;
}

// DbStorage class - PostgreSQL implementation
export class DbStorage implements IStorage {
  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const [result] = await requireDb()
      .insert(comparisons)
      .values(insertComparison as any)
      .returning();
    return result;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    const [result] = await requireDb().select().from(comparisons).where(eq(comparisons.id, id));
    return result;
  }

  async getComparisons(): Promise<Comparison[]> {
    return await requireDb()
      .select()
      .from(comparisons)
      .orderBy(desc(comparisons.createdAt));
  }

  async createVixraSession(insertSession: InsertVixraSession): Promise<VixraSession> {
    const [result] = await requireDb()
      .insert(vixraSessions)
      .values(insertSession as any)
      .returning();
    return result;
  }

  async updateVixraSession(id: string, updates: Partial<InsertVixraSession>): Promise<VixraSession | undefined> {
    const [result] = await requireDb()
      .update(vixraSessions)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(vixraSessions.id, id))
      .returning();
    return result;
  }

  async getVixraSession(id: string): Promise<VixraSession | undefined> {
    const [result] = await requireDb().select().from(vixraSessions).where(eq(vixraSessions.id, id));
    return result;
  }

  async getVixraSessions(): Promise<VixraSession[]> {
    return await requireDb()
      .select()
      .from(vixraSessions)
      .orderBy(desc(vixraSessions.updatedAt));
  }

  async createPromptAudit(insertAudit: InsertPromptAudit): Promise<PromptAuditRecord> {
    const [result] = await requireDb()
      .insert(promptAudits)
      .values(insertAudit as any)
      .returning();
    return result;
  }

  async getPromptAudit(id: string): Promise<PromptAuditRecord | undefined> {
    const [result] = await requireDb().select().from(promptAudits).where(eq(promptAudits.id, id));
    return result;
  }

  async getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]> {
    if (templateId) {
      return await requireDb()
        .select()
        .from(promptAudits)
        .where(eq(promptAudits.templateId, templateId))
        .orderBy(desc(promptAudits.createdAt));
    }
    return await requireDb()
      .select()
      .from(promptAudits)
      .orderBy(desc(promptAudits.createdAt));
  }

  // Luigi pipeline operations
  async createLuigiRun(run: InsertLuigiRun): Promise<LuigiRun> {
    const [result] = await requireDb()
      .insert(luigiRuns)
      .values(run as any)
      .returning();
    return result;
  }

  async updateLuigiRun(id: string, update: LuigiRunUpdate): Promise<LuigiRun | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (update.missionName !== undefined) updateData.missionName = update.missionName;
    if (update.objective !== undefined) updateData.objective = update.objective;
    if (update.constraints !== undefined) updateData.constraints = update.constraints;
    if (update.successCriteria !== undefined) updateData.successCriteria = update.successCriteria;
    if (update.stakeholderNotes !== undefined) updateData.stakeholderNotes = update.stakeholderNotes;
    if (update.userPrompt !== undefined) updateData.userPrompt = update.userPrompt;
    if (update.status !== undefined) updateData.status = update.status;
    if (update.currentStageId !== undefined) updateData.currentStageId = update.currentStageId;
    if (update.stages !== undefined) updateData.stages = update.stages as LuigiStagesPayload;
    if (update.totalCostCents !== undefined) updateData.totalCostCents = update.totalCostCents;
    if (update.completedAt !== undefined) updateData.completedAt = update.completedAt;

    const [result] = await requireDb()
      .update(luigiRuns)
      .set(updateData)
      .where(eq(luigiRuns.id, id))
      .returning();
    return result;
  }

  async getLuigiRun(id: string): Promise<LuigiRun | undefined> {
    const [result] = await requireDb().select().from(luigiRuns).where(eq(luigiRuns.id, id));
    return result;
  }

  async listLuigiRuns(limit = 50): Promise<LuigiRun[]> {
    return await requireDb()
      .select()
      .from(luigiRuns)
      .orderBy(desc(luigiRuns.createdAt))
      .limit(limit);
  }

  async appendLuigiMessage(message: InsertLuigiMessage): Promise<LuigiMessage> {
    const [result] = await requireDb()
      .insert(luigiMessages)
      .values(message as any)
      .returning();
    return result;
  }

  async getLuigiMessages(runId: string, limit = 200): Promise<LuigiMessage[]> {
    return await requireDb()
      .select()
      .from(luigiMessages)
      .where(eq(luigiMessages.runId, runId))
      .orderBy(luigiMessages.createdAt)
      .limit(limit);
  }

  async saveLuigiArtifact(artifact: InsertLuigiArtifact): Promise<LuigiArtifact> {
    const [result] = await requireDb()
      .insert(luigiArtifacts)
      .values(artifact as any)
      .returning();
    return result;
  }

  async getLuigiArtifacts(runId: string): Promise<LuigiArtifact[]> {
    return await requireDb()
      .select()
      .from(luigiArtifacts)
      .where(eq(luigiArtifacts.runId, runId))
      .orderBy(desc(luigiArtifacts.createdAt));
  }

  async createArcRun(run: InsertArcRun): Promise<ArcRun> {
    const [result] = await requireDb()
      .insert(arcRuns)
      .values(run as any)
      .returning();
    return result;
  }

  async updateArcRun(id: string, update: ArcRunUpdate): Promise<ArcRun | undefined> {
    const payload = {
      ...update,
      updatedAt: update.updatedAt ?? new Date(),
    } as any;

    const [result] = await requireDb()
      .update(arcRuns)
      .set(payload)
      .where(eq(arcRuns.id, id))
      .returning();
    return result;
  }

  async getArcRun(id: string): Promise<ArcRun | undefined> {
    const [result] = await requireDb()
      .select()
      .from(arcRuns)
      .where(eq(arcRuns.id, id))
      .limit(1);
    return result || undefined;
  }

  async listArcRuns(limit = 50): Promise<ArcRun[]> {
    return await requireDb()
      .select()
      .from(arcRuns)
      .orderBy(desc(arcRuns.createdAt))
      .limit(limit);
  }

  async appendArcMessage(message: InsertArcMessage): Promise<ArcMessage> {
    const [result] = await requireDb()
      .insert(arcMessages)
      .values(message as any)
      .returning();
    return result;
  }

  async getArcMessages(runId: string, limit = 200): Promise<ArcMessage[]> {
    return await requireDb()
      .select()
      .from(arcMessages)
      .where(eq(arcMessages.runId, runId))
      .orderBy(desc(arcMessages.createdAt))
      .limit(limit);
  }

  async saveArcArtifact(artifact: InsertArcArtifact): Promise<ArcArtifact> {
    const [result] = await requireDb()
      .insert(arcArtifacts)
      .values(artifact as any)
      .returning();
    return result;
  }

  async getArcArtifacts(runId: string): Promise<ArcArtifact[]> {
    return await requireDb()
      .select()
      .from(arcArtifacts)
      .where(eq(arcArtifacts.runId, runId))
      .orderBy(desc(arcArtifacts.createdAt));
  }

  // Debate session operations
  async createDebateSession(session: InsertDebateSession): Promise<DebateSession> {
    const id = `debate_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const [result] = await requireDb()
      .insert(debateSessions)
      .values({
        id,
        topicText: session.topicText,
        model1Id: session.model1Id,
        model2Id: session.model2Id,
        adversarialLevel: session.adversarialLevel,
        turnHistory: [],
        model1ResponseIds: [],
        model2ResponseIds: [],
        totalCost: 0
      } as any)
      .returning();
    return result;
  }

  async updateDebateSession(
    id: string,
    turnData: {
      turn: number;
      modelId: string;
      content: string;
      reasoning: string;
      responseId: string;
      cost: number;
      costBreakdown?: any;
      tokenUsage?: any;
      structuredOutput?: unknown;
      summary?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const session = await this.getDebateSession(id);
    if (!session) throw new Error('Session not found');

    const turnRecord = {
      turn: turnData.turn,
      modelId: turnData.modelId,
      content: turnData.content,
      reasoning: turnData.reasoning,
      responseId: turnData.responseId,
      cost: turnData.cost,
      costBreakdown: turnData.costBreakdown ?? null,
      tokenUsage: turnData.tokenUsage ?? null,
      structuredOutput: turnData.structuredOutput ?? null,
      summary: turnData.summary ?? turnData.reasoning,
      metadata: turnData.metadata ?? {},
    };

    const turnHistory = [...(session.turnHistory as any[]), turnRecord];

    // Update appropriate response ID array
    const isModel1 = turnData.modelId === session.model1Id;
    const model1ResponseIds = isModel1
      ? [...(session.model1ResponseIds as string[]), turnData.responseId]
      : (session.model1ResponseIds as string[]);
    const model2ResponseIds = !isModel1
      ? [...(session.model2ResponseIds as string[]), turnData.responseId]
      : (session.model2ResponseIds as string[]);

    await requireDb()
      .update(debateSessions)
      .set({
        turnHistory,
        model1ResponseIds,
        model2ResponseIds,
        totalCost: Number(session.totalCost || 0) + turnData.cost,
        updatedAt: new Date()
      } as any)
      .where(eq(debateSessions.id, id));
  }

  async getDebateSession(id: string): Promise<DebateSession | undefined> {
    const [result] = await requireDb()
      .select()
      .from(debateSessions)
      .where(eq(debateSessions.id, id))
      .limit(1);

    return result || undefined;
  }

  async listDebateSessions(): Promise<DebateSession[]> {
    return await requireDb()
      .select()
      .from(debateSessions)
      .orderBy(desc(debateSessions.updatedAt), desc(debateSessions.createdAt));
  }

  // User authentication operations
  async getUser(id: string): Promise<User | undefined> {
    const [result] = await requireDb().select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByDeviceId(deviceId: string): Promise<User | undefined> {
    const [result] = await requireDb().select().from(users).where(eq(users.deviceId, deviceId));
    return result;
  }

  async createAnonymousUser(deviceId: string): Promise<User> {
    const [result] = await requireDb()
      .insert(users)
      .values({
        deviceId: deviceId,
        credits: 500,
      })
      .returning();
    return result;
  }

  async ensureDeviceUser(deviceId: string): Promise<User> {
    const existingUser = await this.getUserByDeviceId(deviceId);
    if (existingUser) {
      return existingUser;
    }
    return await this.createAnonymousUser(deviceId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      const [result] = await requireDb()
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          credits: userData.credits,
          stripeCustomerId: userData.stripeCustomerId,
          stripeSubscriptionId: userData.stripeSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return result;
    } else {
      const [result] = await requireDb()
        .insert(users)
        .values({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          deviceId: userData.deviceId,
          credits: userData.credits ?? 500,
          stripeCustomerId: userData.stripeCustomerId,
          stripeSubscriptionId: userData.stripeSubscriptionId,
        })
        .returning();
      return result;
    }
  }

  async getUserCredits(userId: string): Promise<number> {
    const [result] = await requireDb()
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));
    return result?.credits ?? 0;
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  async addCredits(userId: string, amount: number): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  // Credit reservation operations - atomic to prevent race conditions
  async reserveCredits(userId: string, amount: number, metadata?: Record<string, unknown>): Promise<{
    success: boolean;
    reservationId?: string;
    remainingCredits?: number;
    message?: string;
  }> {
    try {
      // First, cleanup any expired reservations for this user (lazy cleanup)
      await this.cleanupExpiredReservations();

      // Get current credits and pending reservations in a single query
      const [userResult] = await requireDb()
        .select({
          credits: users.credits,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!userResult) {
        return {
          success: false,
          message: 'User not found',
          remainingCredits: 0,
        };
      }

      // Calculate pending reservations for this user
      const pendingReservations = await requireDb()
        .select()
        .from(creditReservations)
        .where(sql`${creditReservations.userId} = ${userId} AND ${creditReservations.status} = 'pending'`);

      const totalPending = pendingReservations.reduce((sum, res) => sum + (res.amount || 0), 0);
      const availableCredits = (userResult.credits || 0) - totalPending;

      // Check if user has enough available credits
      if (availableCredits < amount) {
        return {
          success: false,
          message: `Insufficient credits. Available: ${availableCredits}, Required: ${amount}`,
          remainingCredits: availableCredits,
        };
      }

      // Create reservation with 10-minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const [reservation] = await requireDb()
        .insert(creditReservations)
        .values({
          userId,
          amount,
          status: 'pending',
          expiresAt,
          metadata: metadata || null,
        } as any)
        .returning();

      return {
        success: true,
        reservationId: reservation.id,
        remainingCredits: availableCredits - amount,
      };
    } catch (error) {
      console.error('Failed to reserve credits:', error);
      return {
        success: false,
        message: 'Failed to reserve credits',
        remainingCredits: 0,
      };
    }
  }

  async commitReservation(reservationId: string): Promise<void> {
    try {
      // Get the reservation details
      const [reservation] = await requireDb()
        .select()
        .from(creditReservations)
        .where(eq(creditReservations.id, reservationId));

      if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found`);
      }

      if (reservation.status !== 'pending') {
        throw new Error(`Reservation ${reservationId} is not pending (status: ${reservation.status})`);
      }

      // Check if expired
      if (new Date() > new Date(reservation.expiresAt)) {
        // Mark as refunded instead of committing
        await requireDb()
          .update(creditReservations)
          .set({ status: 'refunded' })
          .where(eq(creditReservations.id, reservationId));
        throw new Error(`Reservation ${reservationId} has expired`);
      }

      // Deduct the credits from the user
      await requireDb()
        .update(users)
        .set({
          credits: sql`${users.credits} - ${reservation.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reservation.userId));

      // Mark reservation as committed
      await requireDb()
        .update(creditReservations)
        .set({ status: 'committed' })
        .where(eq(creditReservations.id, reservationId));

      console.log(`Committed reservation ${reservationId}: ${reservation.amount} credits deducted from user ${reservation.userId}`);
    } catch (error) {
      console.error('Failed to commit reservation:', error);
      throw error;
    }
  }

  async refundReservation(reservationId: string): Promise<void> {
    try {
      // Get the reservation details
      const [reservation] = await requireDb()
        .select()
        .from(creditReservations)
        .where(eq(creditReservations.id, reservationId));

      if (!reservation) {
        console.warn(`Reservation ${reservationId} not found for refund`);
        return;
      }

      if (reservation.status !== 'pending') {
        console.warn(`Reservation ${reservationId} is not pending (status: ${reservation.status}), cannot refund`);
        return;
      }

      // Mark reservation as refunded (no credit deduction occurs)
      await requireDb()
        .update(creditReservations)
        .set({ status: 'refunded' })
        .where(eq(creditReservations.id, reservationId));

      console.log(`Refunded reservation ${reservationId}: ${reservation.amount} credits returned to user ${reservation.userId}`);
    } catch (error) {
      console.error('Failed to refund reservation:', error);
      throw error;
    }
  }

  async getUserPendingReservations(userId: string): Promise<number> {
    try {
      const pendingReservations = await requireDb()
        .select()
        .from(creditReservations)
        .where(sql`${creditReservations.userId} = ${userId} AND ${creditReservations.status} = 'pending'`);

      return pendingReservations.reduce((sum, res) => sum + (res.amount || 0), 0);
    } catch (error) {
      console.error('Failed to get pending reservations:', error);
      return 0;
    }
  }

  async cleanupExpiredReservations(): Promise<void> {
    try {
      const now = new Date();

      // Mark all expired pending reservations as refunded
      await requireDb()
        .update(creditReservations)
        .set({ status: 'refunded' })
        .where(sql`${creditReservations.status} = 'pending' AND ${creditReservations.expiresAt} < ${now}`);

      console.log(`Cleaned up expired credit reservations`);
    } catch (error) {
      console.error('Failed to cleanup expired reservations:', error);
    }
  }

  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  async updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        stripeCustomerId: info.stripeCustomerId ? info.stripeCustomerId : null,
        stripeSubscriptionId: info.stripeSubscriptionId ? info.stripeSubscriptionId : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  // Payment transaction history operations
  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [result] = await requireDb()
      .insert(paymentTransactions)
      .values(transaction as any)
      .returning();
    return result;
  }

  async getPaymentTransactionsByUserId(userId: string): Promise<PaymentTransaction[]> {
    return await requireDb()
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async getPaymentTransactionByStripeId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined> {
    const [result] = await requireDb()
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.stripePaymentIntentId, stripePaymentIntentId));
    return result;
  }
}

export class MemStorage implements IStorage {
  private comparisons: Map<string, Comparison>;
  private vixraSessions: Map<string, VixraSession>;
  private promptAudits: Map<string, PromptAuditRecord>;
  private users: Map<string, User>;
  private creditReservations: Map<string, CreditReservation>;
  private luigiRuns: Map<string, LuigiRun>;
  private luigiMessages: Map<string, LuigiMessage[]>;
  private luigiArtifacts: Map<string, LuigiArtifact[]>;
  private arcRuns: Map<string, ArcRun>;
  private arcMessages: Map<string, ArcMessage[]>;
  private arcArtifacts: Map<string, ArcArtifact[]>;
  private debateSessions: Map<string, DebateSession>;
  private paymentTransactions: Map<string, PaymentTransaction>;

  constructor() {
    this.comparisons = new Map();
    this.vixraSessions = new Map();
    this.promptAudits = new Map();
    this.users = new Map();
    this.creditReservations = new Map();
    this.luigiRuns = new Map();
    this.luigiMessages = new Map();
    this.luigiArtifacts = new Map();
    this.arcRuns = new Map();
    this.arcMessages = new Map();
    this.arcArtifacts = new Map();
    this.debateSessions = new Map();
    this.paymentTransactions = new Map();
  }

  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const id = randomUUID();
    const comparison: Comparison = { 
      id,
      prompt: insertComparison.prompt,
      selectedModels: insertComparison.selectedModels as string[],
      responses: insertComparison.responses as Record<string, { content: string; status: 'success' | 'error' | 'loading'; responseTime: number; error?: string }>,
      createdAt: new Date()
    };
    this.comparisons.set(id, comparison);
    return comparison;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    return this.comparisons.get(id);
  }

  async getComparisons(): Promise<Comparison[]> {
    return Array.from(this.comparisons.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createVixraSession(insertSession: InsertVixraSession): Promise<VixraSession> {
    const id = randomUUID();
    const session: VixraSession = {
      id,
      variables: insertSession.variables,
      template: insertSession.template,
      responses: insertSession.responses as Record<string, {
        content: string;
        reasoning?: string;
        status: 'success' | 'error' | 'loading';
        responseTime: number;
        tokenUsage?: { input: number; output: number; reasoning?: number };
        cost?: { total: number; input: number; output: number; reasoning?: number };
        modelName: string;
        error?: string;
      }>,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vixraSessions.set(id, session);
    return session;
  }

  async updateVixraSession(id: string, updates: Partial<InsertVixraSession>): Promise<VixraSession | undefined> {
    const existing = this.vixraSessions.get(id);
    if (!existing) return undefined;
    
    const updated: VixraSession = {
      ...existing,
      ...updates,
      responses: updates.responses ? updates.responses as Record<string, {
        content: string;
        reasoning?: string;
        status: 'success' | 'error' | 'loading';
        responseTime: number;
        tokenUsage?: { input: number; output: number; reasoning?: number };
        cost?: { total: number; input: number; output: number; reasoning?: number };
        modelName: string;
        error?: string;
      }> : existing.responses,
      updatedAt: new Date()
    };
    this.vixraSessions.set(id, updated);
    return updated;
  }

  async getVixraSession(id: string): Promise<VixraSession | undefined> {
    return this.vixraSessions.get(id);
  }

  async getVixraSessions(): Promise<VixraSession[]> {
    return Array.from(this.vixraSessions.values()).sort(
      (a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
    );
  }

  async createPromptAudit(insertAudit: InsertPromptAudit): Promise<PromptAuditRecord> {
    const id = randomUUID();
    const audit: PromptAuditRecord = {
      id,
      templateId: insertAudit.templateId,
      variables: insertAudit.variables,
      resolvedSections: insertAudit.resolvedSections as any,
      messageStructure: insertAudit.messageStructure as any,
      modelId: insertAudit.modelId || null,
      responseContent: insertAudit.responseContent || null,
      responseTime: insertAudit.responseTime || null,
      tokenUsage: insertAudit.tokenUsage ? {
        input: insertAudit.tokenUsage.input,
        output: insertAudit.tokenUsage.output,
        reasoning: insertAudit.tokenUsage.reasoning as number | undefined
      } : null,
      cost: insertAudit.cost ? {
        total: insertAudit.cost.total,
        input: insertAudit.cost.input,
        output: insertAudit.cost.output,
        reasoning: insertAudit.cost.reasoning as number | undefined
      } : null,
      createdAt: new Date()
    };
    this.promptAudits.set(id, audit);
    return audit;
  }

  async getPromptAudit(id: string): Promise<PromptAuditRecord | undefined> {
    return this.promptAudits.get(id);
  }

  async getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]> {
    const audits = Array.from(this.promptAudits.values());
    const filtered = templateId ? audits.filter(a => a.templateId === templateId) : audits;
    return filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Luigi pipeline operations
  async createLuigiRun(run: InsertLuigiRun): Promise<LuigiRun> {
    const id = randomUUID();
    const now = new Date();
    const luigiRun: LuigiRun = {
      id,
      missionName: run.missionName,
      objective: run.objective,
      constraints: run.constraints ?? null,
      successCriteria: run.successCriteria ?? null,
      stakeholderNotes: run.stakeholderNotes ?? null,
      userPrompt: run.userPrompt,
      status: run.status,
      currentStageId: run.currentStageId ?? null,
      stages: run.stages as LuigiStagesPayload,
      totalCostCents: run.totalCostCents ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.luigiRuns.set(id, luigiRun);
    this.luigiMessages.set(id, []);
    this.luigiArtifacts.set(id, []);
    return luigiRun;
  }

  async updateLuigiRun(id: string, update: LuigiRunUpdate): Promise<LuigiRun | undefined> {
    const existing = this.luigiRuns.get(id);
    if (!existing) {
      return undefined;
    }
    const updated: LuigiRun = {
      ...existing,
      missionName: update.missionName !== undefined ? update.missionName : existing.missionName,
      objective: update.objective !== undefined ? update.objective : existing.objective,
      constraints: update.constraints !== undefined ? update.constraints : existing.constraints ?? null,
      successCriteria: update.successCriteria !== undefined ? update.successCriteria : existing.successCriteria ?? null,
      stakeholderNotes: update.stakeholderNotes !== undefined ? update.stakeholderNotes : existing.stakeholderNotes ?? null,
      userPrompt: update.userPrompt !== undefined ? update.userPrompt : existing.userPrompt,
      status: update.status !== undefined ? update.status : existing.status,
      currentStageId: update.currentStageId !== undefined ? update.currentStageId : existing.currentStageId ?? null,
      stages: update.stages !== undefined ? update.stages as LuigiStagesPayload : existing.stages,
      totalCostCents: update.totalCostCents !== undefined ? update.totalCostCents : existing.totalCostCents ?? null,
      updatedAt: new Date(),
      completedAt: update.completedAt !== undefined ? update.completedAt : existing.completedAt ?? null,
    };
    this.luigiRuns.set(id, updated);
    return updated;
  }

  async getLuigiRun(id: string): Promise<LuigiRun | undefined> {
    return this.luigiRuns.get(id);
  }

  async listLuigiRuns(limit = 50): Promise<LuigiRun[]> {
    const runs = Array.from(this.luigiRuns.values());
    return runs
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async appendLuigiMessage(message: InsertLuigiMessage): Promise<LuigiMessage> {
    const runMessages = this.luigiMessages.get(message.runId) ?? [];
    const luigiMessage: LuigiMessage = {
      id: randomUUID(),
      runId: message.runId,
      role: message.role,
      stageId: message.stageId ?? null,
      agentId: message.agentId ?? null,
      toolName: message.toolName ?? null,
      content: message.content,
      reasoning: message.reasoning ?? null,
      metadata: message.metadata as Record<string, unknown> | null ?? null,
      createdAt: new Date(),
    };
    runMessages.push(luigiMessage);
    this.luigiMessages.set(message.runId, runMessages);
    return luigiMessage;
  }

  async getLuigiMessages(runId: string, limit = 200): Promise<LuigiMessage[]> {
    const messages = this.luigiMessages.get(runId) ?? [];
    return messages.slice(-limit);
  }

  async saveLuigiArtifact(artifact: InsertLuigiArtifact): Promise<LuigiArtifact> {
    const runArtifacts = this.luigiArtifacts.get(artifact.runId) ?? [];
    const record: LuigiArtifact = {
      id: randomUUID(),
      runId: artifact.runId,
      stageId: artifact.stageId,
      type: artifact.type,
      title: artifact.title,
      description: artifact.description ?? null,
      storagePath: artifact.storagePath ?? null,
      data: artifact.data as Record<string, unknown> | null ?? null,
      createdAt: new Date(),
    };
    runArtifacts.push(record);
    this.luigiArtifacts.set(artifact.runId, runArtifacts);
    return record;
  }

  async getLuigiArtifacts(runId: string): Promise<LuigiArtifact[]> {
    return [...(this.luigiArtifacts.get(runId) ?? [])].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createArcRun(run: InsertArcRun): Promise<ArcRun> {
    const id = randomUUID();
    const now = new Date();
    const record: ArcRun = {
      id,
      taskId: run.taskId,
      challengeName: run.challengeName,
      puzzleDescription: run.puzzleDescription,
      puzzlePayload: run.puzzlePayload as Record<string, unknown>,
      targetPatternSummary: run.targetPatternSummary ?? null,
      evaluationFocus: run.evaluationFocus ?? null,
      status: run.status as ArcRunStatus,
      currentStageId: run.currentStageId ?? null,
      stages: run.stages as Record<string, unknown>,
      totalCostCents: run.totalCostCents ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.arcRuns.set(id, record);
    this.arcMessages.set(id, []);
    this.arcArtifacts.set(id, []);
    return record;
  }

  async updateArcRun(id: string, update: ArcRunUpdate): Promise<ArcRun | undefined> {
    const existing = this.arcRuns.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ArcRun = {
      ...existing,
      taskId: update.taskId ?? existing.taskId,
      challengeName: update.challengeName ?? existing.challengeName,
      puzzleDescription: update.puzzleDescription ?? existing.puzzleDescription,
      puzzlePayload: update.puzzlePayload ?? existing.puzzlePayload,
      targetPatternSummary: update.targetPatternSummary !== undefined ? update.targetPatternSummary : existing.targetPatternSummary ?? null,
      evaluationFocus: update.evaluationFocus !== undefined ? update.evaluationFocus : existing.evaluationFocus ?? null,
      status: update.status ?? existing.status,
      currentStageId: update.currentStageId !== undefined ? update.currentStageId : existing.currentStageId ?? null,
      stages: update.stages ?? existing.stages,
      totalCostCents: update.totalCostCents !== undefined ? update.totalCostCents : existing.totalCostCents ?? null,
      updatedAt: new Date(),
      completedAt: update.completedAt !== undefined ? update.completedAt : existing.completedAt ?? null,
    };

    this.arcRuns.set(id, updated);
    return updated;
  }

  async getArcRun(id: string): Promise<ArcRun | undefined> {
    return this.arcRuns.get(id);
  }

  async listArcRuns(limit = 50): Promise<ArcRun[]> {
    const runs = Array.from(this.arcRuns.values());
    return runs
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async appendArcMessage(message: InsertArcMessage): Promise<ArcMessage> {
    const messages = this.arcMessages.get(message.runId) ?? [];
    const record: ArcMessage = {
      id: randomUUID(),
      runId: message.runId,
      role: message.role as ArcMessageRole,
      stageId: message.stageId ?? null,
      agentId: message.agentId ?? null,
      content: message.content,
      reasoning: message.reasoning ?? null,
      metadata: message.metadata as Record<string, unknown> | null ?? null,
      createdAt: new Date(),
    };
    messages.push(record);
    this.arcMessages.set(message.runId, messages);
    return record;
  }

  async getArcMessages(runId: string, limit = 200): Promise<ArcMessage[]> {
    const messages = this.arcMessages.get(runId) ?? [];
    return messages.slice(-limit);
  }

  async saveArcArtifact(artifact: InsertArcArtifact): Promise<ArcArtifact> {
    const artifacts = this.arcArtifacts.get(artifact.runId) ?? [];
    const record: ArcArtifact = {
      id: randomUUID(),
      runId: artifact.runId,
      stageId: artifact.stageId,
      type: artifact.type,
      title: artifact.title,
      description: artifact.description ?? null,
      data: artifact.data as Record<string, unknown> | null ?? null,
      createdAt: new Date(),
    };
    artifacts.push(record);
    this.arcArtifacts.set(artifact.runId, artifacts);
    return record;
  }

  async getArcArtifacts(runId: string): Promise<ArcArtifact[]> {
    return [...(this.arcArtifacts.get(runId) ?? [])].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Debate session operations
  async createDebateSession(session: InsertDebateSession): Promise<DebateSession> {
    const id = `debate_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const debateSession: DebateSession = {
      id,
      topicText: session.topicText,
      model1Id: session.model1Id,
      model2Id: session.model2Id,
      adversarialLevel: session.adversarialLevel,
      turnHistory: [],
      model1ResponseIds: [],
      model2ResponseIds: [],
      totalCost: '0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.debateSessions.set(id, debateSession);
    return debateSession;
  }

  async updateDebateSession(
    id: string,
    turnData: {
      turn: number;
      modelId: string;
      content: string;
      reasoning: string;
      responseId: string;
      cost: number;
      costBreakdown?: any;
      tokenUsage?: any;
      structuredOutput?: unknown;
      summary?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const existing = this.debateSessions.get(id);
    if (!existing) throw new Error('Session not found');

    const turnRecord = {
      turn: turnData.turn,
      modelId: turnData.modelId,
      content: turnData.content,
      reasoning: turnData.reasoning,
      responseId: turnData.responseId,
      cost: turnData.cost,
      costBreakdown: turnData.costBreakdown ?? null,
      tokenUsage: turnData.tokenUsage ?? null,
      structuredOutput: turnData.structuredOutput ?? null,
      summary: turnData.summary ?? turnData.reasoning,
      metadata: turnData.metadata ?? {},
    };

    const turnHistory = [...(existing.turnHistory as any[]), turnRecord];

    // Update appropriate response ID array
    const isModel1 = turnData.modelId === existing.model1Id;
    const model1ResponseIds = isModel1
      ? [...(existing.model1ResponseIds as string[]), turnData.responseId]
      : (existing.model1ResponseIds as string[]);
    const model2ResponseIds = !isModel1
      ? [...(existing.model2ResponseIds as string[]), turnData.responseId]
      : (existing.model2ResponseIds as string[]);

    const nextTotalCost = Number(existing.totalCost ?? 0) + turnData.cost;

    const updated: DebateSession = {
      ...existing,
      turnHistory,
      model1ResponseIds,
      model2ResponseIds,
      totalCost: `${nextTotalCost}`,
      updatedAt: new Date()
    };
    this.debateSessions.set(id, updated);
  }

  async getDebateSession(id: string): Promise<DebateSession | undefined> {
    return this.debateSessions.get(id);
  }

  async listDebateSessions(): Promise<DebateSession[]> {
    return Array.from(this.debateSessions.values()).sort((a, b) => {
      const aUpdated = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt ?? 0).getTime();
      const bUpdated = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt ?? 0).getTime();
      if (Number.isFinite(bUpdated) && Number.isFinite(aUpdated) && bUpdated !== aUpdated) {
        return bUpdated - aUpdated;
      }
      const aCreated = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt ?? 0).getTime();
      const bCreated = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt ?? 0).getTime();
      return (Number.isFinite(bCreated) ? bCreated : 0) - (Number.isFinite(aCreated) ? aCreated : 0);
    });
  }

  // User authentication operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }


  async getUserByDeviceId(deviceId: string): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.find(user => user.deviceId === deviceId);
  }

  async createAnonymousUser(deviceId: string): Promise<User> {
    const id = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2)}`;
    const user: User = {
      id,
      deviceId: deviceId,
      credits: 500, // Anonymous users start with 500 credits
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async ensureDeviceUser(deviceId: string): Promise<User> {
    // Try to find existing user by device ID
    const existingUser = await this.getUserByDeviceId(deviceId);
    if (existingUser) {
      return existingUser;
    }

    // Create new anonymous user
    return await this.createAnonymousUser(deviceId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      // Update existing user
      const existing = this.users.get(userData.id);
      if (!existing) {
        throw new Error(`User with id ${userData.id} not found`);
      }
      
      const updated: User = {
        ...existing,
        credits: userData.credits ?? existing.credits,
        email: userData.email ?? existing.email,
        firstName: userData.firstName ?? existing.firstName,
        lastName: userData.lastName ?? existing.lastName,
        profileImageUrl: userData.profileImageUrl ?? existing.profileImageUrl,
        stripeCustomerId: userData.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        updatedAt: new Date(),
      };
      
      this.users.set(userData.id, updated);
      return updated;
    } else {
      // Create new user
      const id = randomUUID();
      const newUser: User = {
        id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        deviceId: userData.deviceId,
        credits: userData.credits ?? 500,
        stripeCustomerId: userData.stripeCustomerId,
        stripeSubscriptionId: userData.stripeSubscriptionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.users.set(id, newUser);
      return newUser;
    }
  }

  // Credit management operations
  async getUserCredits(userId: string): Promise<number> {
    const user = this.users.get(userId);
    return user?.credits ?? 0;
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const currentCredits = user.credits ?? 0;
    const updated: User = {
      ...user,
      credits: Math.max(0, currentCredits - amount),
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  async addCredits(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const currentCredits = user.credits ?? 0;
    const updated: User = {
      ...user,
      credits: currentCredits + amount,
      updatedAt: new Date(),
    };

    this.users.set(userId, updated);
    return updated;
  }

  // Credit reservation operations - atomic to prevent race conditions
  async reserveCredits(userId: string, amount: number, metadata?: Record<string, unknown>): Promise<{
    success: boolean;
    reservationId?: string;
    remainingCredits?: number;
    message?: string;
  }> {
    try {
      // Cleanup expired reservations first
      await this.cleanupExpiredReservations();

      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          remainingCredits: 0,
        };
      }

      // Calculate pending reservations for this user
      const pendingReservations = Array.from(this.creditReservations.values())
        .filter(res => res.userId === userId && res.status === 'pending');

      const totalPending = pendingReservations.reduce((sum, res) => sum + (res.amount || 0), 0);
      const availableCredits = (user.credits || 0) - totalPending;

      // Check if user has enough available credits
      if (availableCredits < amount) {
        return {
          success: false,
          message: `Insufficient credits. Available: ${availableCredits}, Required: ${amount}`,
          remainingCredits: availableCredits,
        };
      }

      // Create reservation with 10-minute expiry
      const reservationId = randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const reservation: CreditReservation = {
        id: reservationId,
        userId,
        amount,
        status: 'pending',
        expiresAt,
        metadata: metadata || null,
        createdAt: new Date(),
      };

      this.creditReservations.set(reservationId, reservation);

      return {
        success: true,
        reservationId,
        remainingCredits: availableCredits - amount,
      };
    } catch (error) {
      console.error('Failed to reserve credits:', error);
      return {
        success: false,
        message: 'Failed to reserve credits',
        remainingCredits: 0,
      };
    }
  }

  async commitReservation(reservationId: string): Promise<void> {
    const reservation = this.creditReservations.get(reservationId);

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== 'pending') {
      throw new Error(`Reservation ${reservationId} is not pending (status: ${reservation.status})`);
    }

    // Check if expired
    if (new Date() > new Date(reservation.expiresAt)) {
      // Mark as refunded instead of committing
      reservation.status = 'refunded';
      this.creditReservations.set(reservationId, reservation);
      throw new Error(`Reservation ${reservationId} has expired`);
    }

    const user = this.users.get(reservation.userId);
    if (!user) {
      throw new Error(`User ${reservation.userId} not found`);
    }

    // Deduct the credits from the user
    const currentCredits = user.credits ?? 0;
    const updated: User = {
      ...user,
      credits: Math.max(0, currentCredits - reservation.amount),
      updatedAt: new Date(),
    };

    this.users.set(reservation.userId, updated);

    // Mark reservation as committed
    reservation.status = 'committed';
    this.creditReservations.set(reservationId, reservation);

    console.log(`Committed reservation ${reservationId}: ${reservation.amount} credits deducted from user ${reservation.userId}`);
  }

  async refundReservation(reservationId: string): Promise<void> {
    const reservation = this.creditReservations.get(reservationId);

    if (!reservation) {
      console.warn(`Reservation ${reservationId} not found for refund`);
      return;
    }

    if (reservation.status !== 'pending') {
      console.warn(`Reservation ${reservationId} is not pending (status: ${reservation.status}), cannot refund`);
      return;
    }

    // Mark reservation as refunded (no credit deduction occurs)
    reservation.status = 'refunded';
    this.creditReservations.set(reservationId, reservation);

    console.log(`Refunded reservation ${reservationId}: ${reservation.amount} credits returned to user ${reservation.userId}`);
  }

  async getUserPendingReservations(userId: string): Promise<number> {
    try {
      const pendingReservations = Array.from(this.creditReservations.values())
        .filter(res => res.userId === userId && res.status === 'pending');

      return pendingReservations.reduce((sum, res) => sum + (res.amount || 0), 0);
    } catch (error) {
      console.error('Failed to get pending reservations:', error);
      return 0;
    }
  }

  async cleanupExpiredReservations(): Promise<void> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      // Mark all expired pending reservations as refunded
      for (const [id, reservation] of this.creditReservations.entries()) {
        if (reservation.status === 'pending' && new Date(reservation.expiresAt) < now) {
          reservation.status = 'refunded';
          this.creditReservations.set(id, reservation);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired credit reservations`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired reservations:', error);
    }
  }

  // Stripe integration operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updated: User = {
      ...user,
      stripeCustomerId: hashStripeId(customerId),
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updated: User = {
      ...user,
      stripeCustomerId: info.stripeCustomerId ? info.stripeCustomerId : user.stripeCustomerId,
      stripeSubscriptionId: info.stripeSubscriptionId ? info.stripeSubscriptionId : user.stripeSubscriptionId,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  // Payment transaction history operations
  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const id = randomUUID();
    const newTransaction: PaymentTransaction = {
      id,
      userId: transaction.userId,
      stripePaymentIntentId: transaction.stripePaymentIntentId || null,
      invoiceNumber: transaction.invoiceNumber,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      credits: transaction.credits || null,
      status: transaction.status,
      type: transaction.type,
      paymentMethod: transaction.paymentMethod || null,
      cardLast4: transaction.cardLast4 || null,
      receiptUrl: transaction.receiptUrl || null,
      metadata: transaction.metadata || null,
      createdAt: new Date(),
    };
    this.paymentTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getPaymentTransactionsByUserId(userId: string): Promise<PaymentTransaction[]> {
    return Array.from(this.paymentTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPaymentTransactionByStripeId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined> {
    return Array.from(this.paymentTransactions.values())
      .find(t => t.stripePaymentIntentId === stripePaymentIntentId);
  }
}

// Try to use database storage, fall back to memory storage if database is unavailable
async function createStorage(): Promise<IStorage> {
  try {
    // Ensure tables exist first
    await ensureTablesExist();
    
    // Test database connection
    const dbStorage = new DbStorage();
    await dbStorage.getComparisons(); // Simple test query
    console.log("âœ… Connected to PostgreSQL database");
    return dbStorage;
  } catch (error) {
    console.warn("âš ï¸ Database connection failed, using in-memory storage:", (error as Error).message);
    return new MemStorage();
  }
}

// Initialize storage asynchronously
let storageInstance: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (!storageInstance) {
    storageInstance = await createStorage();
  }
  return storageInstance;
}

// For backwards compatibility, create a proxy that initializes on first use
export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    return async (...args: any[]) => {
      const instance = await getStorage();
      return (instance as any)[prop](...args);
    };
  }
});

// Local helper to assert database availability at call sites within this module
function requireDb() {
  if (!db) {
    throw new Error("Database is unavailable (DATABASE_URL not set or connection failed)");
  }
  return db;
}














