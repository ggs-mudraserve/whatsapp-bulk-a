import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { Server } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./db";

// Add global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Add process error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.log('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test Supabase connection on startup
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected && process.env.NODE_ENV === 'production') {
      console.error("Supabase connection failed in production mode. Please check your SUPABASE_URL and SUPABASE_ANON_KEY.");
    }
  } catch (error) {
    console.error("Error testing Supabase connection:", error);
  }

  let server;
  
  try {
    server = await registerRoutes(app);
  } catch (error) {
    console.error("Error registering routes:", error instanceof Error ? error.message : String(error));
    // Fallback to basic HTTP server if registerRoutes fails
    server = new Server(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Express error handler caught:', err.message);
    
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Don't re-throw the error to prevent process crash
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Don't re-throw the error to prevent process crash
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "localhost", () => {
    log(`Server running on port ${port}`);
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`Database: ${process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? 'Supabase Configured' : 'Supabase Not configured'}`);
  });
})();
