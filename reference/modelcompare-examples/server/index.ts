/**
 * Server Entry Point - Express Application Bootstrap
 * 
 * This is the main server entry point that initializes and starts the Express.js
 * application. It handles:
 * 
 * - Express server setup with middleware configuration
 * - Static file serving for the Vite frontend application
 * - API route registration and middleware setup
 * - Session management with PostgreSQL store
 * - Environment configuration and error handling
 * - Development vs production mode detection
 * - Server startup and port binding
 * 
 * The server integrates the frontend Vite build with the backend API,
 * providing a unified application served from a single port.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { TemplateValidator } from "./template-validator.js";
import { TemplateCompiler } from "./template-compiler.js";
import { initializeDatabaseManager } from "./db.js";
import { formatErrorResponse } from "./errors.js";
import { requestContextMiddleware, requestCompletionLogger, contextLog, contextError } from "./request-context.js";
import { config, isDevelopment, isProduction, getSecurityConfig, getServerConfig } from "./config.js";
import { configurePassport, configureSession } from "./auth.js";
import { validateStripeConfig } from "./stripe.js";
import { getStorage } from "./storage.js";

const app = express();

// Security middleware (early in the stack)
const securityConfig = getSecurityConfig();

if (securityConfig.enableHelmet) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: securityConfig.cspDirectives,
    },
    crossOriginEmbedderPolicy: false, // Disable for compatibility
  }));
}

// CORS configuration
if (securityConfig.enableCors) {
  app.use(cors({
    origin: isProduction() 
      ? config.server.corsOrigins
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID']
  }));
}

// Request context tracing middleware
app.use(requestContextMiddleware());
app.use(requestCompletionLogger());

app.use(express.json({ limit: config.server.jsonSizeLimit, verify: (req: any, _res, buf) => { if (req.originalUrl === '/api/stripe/webhook' || req.originalUrl === '/api/webhooks/webhook') { req.rawBody = buf; } } }));
app.use(express.urlencoded({ extended: false, limit: config.server.jsonSizeLimit }));

// JSON response capturing for debugging (optional)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      // Context logging will handle request completion
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }
  next();
});

(async () => {
  // Configure authentication (Passport + Sessions) before routes
  configurePassport();
  await configureSession(app);

  const stripeConfig = validateStripeConfig();
  if (!stripeConfig.isValid) {
    contextError('Stripe config invalid:', stripeConfig.errors.join('; '));
  } else {
    contextLog('✅ Stripe configuration validated');
  }

  const server = await registerRoutes(app);

  // Validate all templates at startup
  contextLog('Validating templates...');
  const templateValidator = new TemplateValidator();
  const validationResult = await templateValidator.validateAllTemplates();
  
  if (!validationResult.isValid) {
    contextError('Template validation failed:');
    validationResult.errors.forEach(error => {
      contextError(`  - ${error.file}${error.category ? ` (${error.category})` : ''}${error.template ? ` [${error.template}]` : ''}: ${error.error}`);
    });
    process.exit(1);
  }
  
  if (validationResult.warnings.length > 0) {
    contextLog('⚠️ Template validation warnings:');
    validationResult.warnings.forEach(warning => {
      contextLog(`  - ${warning}`);
    });
  }
  
  contextLog('✅ Template validation completed successfully');

  // Compile and cache all templates
  const templateCompiler = new TemplateCompiler();
  await templateCompiler.compileAllTemplates();
  
  // Make template compiler available to routes
  app.locals.templateCompiler = templateCompiler;

  // Initialize database manager with connection pooling
  const databaseManager = await initializeDatabaseManager();
  if (databaseManager) {
    app.locals.databaseManager = databaseManager;
    contextLog('✅ Database connection pool initialized');
  } else {
    contextLog('⚠️ No database configured - using in-memory storage');
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const errorResponse = formatErrorResponse(err);
    
    // Log error with context for debugging
    if (errorResponse.statusCode >= 500) {
      contextError(`Server error: ${err.message}`, err.stack);
    } else {
      contextLog(`Client error ${errorResponse.statusCode}: ${err.message}`);
    }
    
    res.status(errorResponse.statusCode).json(errorResponse);
  });

  // Setup Vite in development or serve static files in production
  if (isDevelopment()) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server with configuration
  const serverConfig = getServerConfig();
  server.listen({
    port: serverConfig.port,
    host: serverConfig.host,
  }, () => {
    contextLog(`🚀 Server started successfully`);
    contextLog(`📡 Environment: ${serverConfig.environment}`);
    contextLog(`🌐 Server: http://${serverConfig.host}:${serverConfig.port}`);
    contextLog(`🔧 Legacy routes: ${serverConfig.enableLegacyRoutes ? 'enabled' : 'disabled'}`);
    contextLog(`🛡️ Security: Helmet=${securityConfig.enableHelmet}, CORS=${securityConfig.enableCors}`);
  });

  // Credit reservation cleanup job - runs every 5 minutes
  // This prevents abandoned reservations from permanently blocking credits
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const cleanupInterval = setInterval(async () => {
    try {
      const storage = await getStorage();
      await storage.cleanupExpiredReservations();
    } catch (error) {
      contextError('Failed to cleanup expired credit reservations:', error);
    }
  }, CLEANUP_INTERVAL_MS);

  // Run cleanup immediately on startup
  (async () => {
    try {
      const storage = await getStorage();
      await storage.cleanupExpiredReservations();
      contextLog('✅ Initial credit reservation cleanup completed');
    } catch (error) {
      contextError('Failed to perform initial credit reservation cleanup:', error);
    }
  })();

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    contextLog(`📨 Received ${signal}, starting graceful shutdown...`);

    // Stop the cleanup interval
    clearInterval(cleanupInterval);
    contextLog('⏸️ Credit cleanup job stopped');

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        contextError('Error during server shutdown', err);
        process.exit(1);
      }

      contextLog('🚪 HTTP server closed');

      try {
        // Close database connections
        const databaseManager = app.locals.databaseManager;
        if (databaseManager) {
          await databaseManager.close();
          contextLog('🗄️ Database connections closed');
        }

        contextLog('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        contextError('Error during cleanup', error);
        process.exit(1);
      }
    });

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
      contextError('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 second timeout
  };

  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    contextError('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    contextError(`💥 Unhandled Rejection at: ${promise} reason: ${reason}`);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

})();
