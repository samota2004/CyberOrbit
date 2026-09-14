import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import apiRouter from "./routes/index.js";
import {
  notFoundHandler,
  errorHandler
} from "./middleware/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "CyberOrbit API"
  });
});

// API routes
app.use("/api", apiRouter);

// Vite development server / production static files
if (process.env.NODE_ENV !== "production") {
  const viteConfigFile = path.resolve(
    __dirname,
    "../client/vite.config.js"
  );

  const vite = await createViteServer({
    configFile: viteConfigFile,
    server: {
      middlewareMode: true
    },
    appType: "spa"
  });

  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, "../client/dist");

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[CyberOrbit SOC] Server running on http://localhost:${PORT}`
  );
});