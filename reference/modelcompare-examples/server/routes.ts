/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This main routes file orchestrates all route modules, registering them with the Express app and applying global middleware like error handling. It integrates with all route modules and touches middleware for application-wide setup.
 * SRP/DRY check: Pass - Focused solely on route registration. Route registration patterns were scattered in the monolithic file; this centralizes them. Reviewed existing route setup to ensure no duplication.
 */
import type { Express } from "express";
import { createServer, type Server } from "http";
import { createLuigiRouter } from './routes/luigi';
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./routes/auth.routes";
import { creditsRoutes } from "./routes/credits.routes";
import { modelsRoutes } from "./routes/models.routes";
import { generateRoutes } from "./routes/generate.routes";
import { templatesRoutes } from "./routes/templates.routes";
import { sessionsRoutes } from "./routes/sessions.routes";
import { auditsRoutes } from "./routes/audits.routes";
import { healthRoutes } from "./routes/health.routes";
import { arcAgiRoutes } from "./routes/arc-agi.routes";
import { creativeRoutes } from "./routes/creative.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { debateRoutes } from "./routes/debate.routes";
import { createArcAgentRouter } from "./routes/arc-agent.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register Luigi router
  app.use('/api/luigi', createLuigiRouter());
  app.use('/api/arc-agent', createArcAgentRouter());

  // Register modular route handlers
  app.use('/api/auth', authRoutes);
  app.use('/api/stripe', creditsRoutes);
  app.use('/api/models', modelsRoutes);
  app.use('/api/generate', generateRoutes);
  app.use('/api/debate', debateRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/audits', auditsRoutes);
  app.use('/health', healthRoutes);
  app.use('/api/arc-agi', arcAgiRoutes);
  app.use('/api/creative', creativeRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // Global error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
