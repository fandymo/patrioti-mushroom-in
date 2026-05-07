import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runMigrations, ensureAdminUser } from "../migrate";

async function startServer() {
  console.log("[startup] Node version:", process.version);
  console.log("[startup] NODE_ENV:", process.env.NODE_ENV);
  console.log("[startup] PORT:", process.env.PORT);
  console.log("[startup] DATABASE_URL set:", !!process.env.DATABASE_URL);
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Health check for Railway
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

async function main() {
  // Start server first so Railway health check passes immediately
  await startServer();

  // Run migrations in the background after server is up
  runMigrations()
    .then(() => ensureAdminUser())
    .catch((err) => console.error("[startup] Migration error:", err));
}

main().catch(console.error);
